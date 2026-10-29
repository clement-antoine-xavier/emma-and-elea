import {prisma} from "@/lib/prisma";
import type {Prisma} from "@/generated/prisma/client";
import {Decimal} from "@prisma/client/runtime/client";
import {DomainError} from "@/server/domain/errors";
import {buildLotNumber, receiptNumberPrefix, nextDocumentSequence} from "@/server/domain/receipt";
import type {
  BatchStatusName,
  LotTraceRecord,
  ProductionBatchDetailRecord,
  ProductionBatchInputRecord,
  ProductionBatchOutputRecord,
  ProductionBatchSummaryRecord,
  ProductionOptions,
  RecipeCostLineRecord,
  RecipeCostRecord,
  RecipeLineRecord,
  RecipeOperationRecord,
  WasteOptions,
  WasteRecordSummary,
} from "@/lib/dto";
import type {CostSnapshotInput} from "./recipe.repository";
import type {AvailableLot} from "@/server/domain/production";
import {withTransaction} from "./transaction";

export type ProductionBatchInput = {
  siteId: string;
  recipeVersionId: string;
  productionPlanLineId?: string | null;
  plannedQuantity: string;
  unitId: string;
  plannedStartAt: Date | null;
  note: string | null;
};

export type BatchCompletionInput = {
  actualQuantity: string;
  producedOn: Date;
  inputs: {
    lotId: string;
    itemId: string;
    quantity: string;
    unitId: string;
    unitCost: string;
    theoreticalQuantity: string;
  }[];
  output: {
    itemId: string;
    quantity: string;
    unitId: string;
    unitCost: string;
    expiresOn: Date | null;
  };
  cost: CostSnapshotInput;
};

export type WasteInput = {
  lotId: string;
  lossReasonId: string;
  quantity: string;
  reason: string | null;
  recordedAt: Date;
};

export interface ProductionRepository {
  listBatches(organizationId: string): Promise<ProductionBatchSummaryRecord[]>;
  findBatch(
    organizationId: string,
    id: string,
  ): Promise<ProductionBatchDetailRecord | null>;
  createBatch(
    organizationId: string,
    input: ProductionBatchInput,
  ): Promise<string>;
  startBatch(organizationId: string, id: string): Promise<void>;
  cancelBatch(organizationId: string, id: string): Promise<void>;
  listAvailableLots(
    organizationId: string,
    siteId: string,
    itemIds: readonly string[],
  ): Promise<AvailableLot[]>;
  complete(
    organizationId: string,
    batchId: string,
    plan: BatchCompletionInput,
    userId: string,
  ): Promise<void>;
  options(organizationId: string): Promise<ProductionOptions>;
  listWaste(organizationId: string): Promise<WasteRecordSummary[]>;
  wasteOptions(organizationId: string): Promise<WasteOptions>;
  recordWaste(
    organizationId: string,
    input: WasteInput,
    userId: string,
  ): Promise<void>;
  archiveWaste(organizationId: string, id: string): Promise<void>;
  trace(organizationId: string, lotId: string): Promise<LotTraceRecord | null>;
}

function toCost(
  snapshot: {
    materialCost: {toString(): string};
    packagingCost: {toString(): string};
    labourCost: {toString(): string};
    energyCost: {toString(): string};
    overheadCost: {toString(): string};
    totalCost: {toString(): string};
    costPerUnit: {toString(): string};
    marginPct: {toString(): string} | null;
    currency: string;
    computedAt: Date;
    inputHash: string | null;
    lines: Array<{
      id: string;
      kind: string;
      label: string;
      quantity: {toString(): string} | null;
      unit: {code: string} | null;
      unitCost: {toString(): string} | null;
      amount: {toString(): string};
    }>;
  } | null,
): RecipeCostRecord | null {
  if (!snapshot) return null;

  return {
    materialCost: snapshot.materialCost.toString(),
    packagingCost: snapshot.packagingCost.toString(),
    labourCost: snapshot.labourCost.toString(),
    energyCost: snapshot.energyCost.toString(),
    overheadCost: snapshot.overheadCost.toString(),
    totalCost: snapshot.totalCost.toString(),
    costPerUnit: snapshot.costPerUnit.toString(),
    marginPct: snapshot.marginPct?.toString() ?? null,
    currency: snapshot.currency,
    computedAt: snapshot.computedAt,
    // A batch snapshot records what the batch actually consumed; it is not
    // refreshed against later prices.
    isStale: false,
    inputHash: snapshot.inputHash,
    lines: snapshot.lines.map((line) => ({
      id: line.id,
      kind: line.kind as RecipeCostLineRecord["kind"],
      label: line.label,
      quantity: line.quantity?.toString() ?? null,
      unitCode: line.unit?.code ?? null,
      unitCost: line.unitCost?.toString() ?? null,
      amount: line.amount.toString(),
    })),
    warnings: [],
  };
}

const batchSelect = {
  id: true,
  code: true,
  status: true,
  siteId: true,
  site: {select: {name: true}},
  recipeVersionId: true,
  plannedQuantity: true,
  actualQuantity: true,
  unitId: true,
  unit: {select: {code: true, kind: true, factorToBase: true}},
  plannedStartAt: true,
  startedAt: true,
  completedAt: true,
  producedOn: true,
  note: true,
  createdAt: true,
  recipeVersion: {
    select: {
      versionNumber: true,
      yieldQuantity: true,
      yieldUnitId: true,
      yieldUnit: {select: {code: true, kind: true, factorToBase: true}},
      recipe: {
        select: {
          id: true,
          name: true,
          outputItem: {
            select: {
              id: true,
              name: true,
              shelfLifeDays: true,
              salePrice: true,
              stockUnit: {
                select: {
                  id: true,
                  code: true,
                  kind: true,
                  factorToBase: true,
                },
              },
            },
          },
        },
      },
    },
  },
  inputs: {
    orderBy: {createdAt: "asc"},
    select: {
      id: true,
      lotId: true,
      lot: {select: {lotNumber: true}},
      itemId: true,
      item: {select: {name: true}},
      unit: {select: {code: true}},
      quantity: true,
      theoreticalQuantity: true,
      unitCost: true,
    },
  },
  outputs: {
    orderBy: {createdAt: "asc"},
    select: {
      id: true,
      lotId: true,
      lot: {select: {lotNumber: true}},
      itemId: true,
      item: {select: {name: true}},
      quantity: true,
      unit: {select: {code: true}},
      isPrimary: true,
      costPerUnit: true,
    },
  },
  costSnapshots: {
    orderBy: {computedAt: "desc"},
    take: 1,
    select: {
      materialCost: true,
      packagingCost: true,
      labourCost: true,
      energyCost: true,
      overheadCost: true,
      totalCost: true,
      costPerUnit: true,
      marginPct: true,
      currency: true,
      computedAt: true,
      inputHash: true,
      lines: {
        orderBy: {position: "asc"},
        select: {
          id: true,
          kind: true,
          label: true,
          quantity: true,
          unit: {select: {code: true}},
          unitCost: true,
          amount: true,
        },
      },
    },
  },
} as const;

type SelectedBatch = Prisma.ProductionBatchGetPayload<{
  select: typeof batchSelect;
}>;

function toSummary(batch: SelectedBatch): ProductionBatchSummaryRecord {
  return {
    id: batch.id,
    code: batch.code,
    status: batch.status as BatchStatusName,
    siteName: batch.site.name,
    recipeName: batch.recipeVersion.recipe.name,
    versionNumber: batch.recipeVersion.versionNumber,
    plannedQuantity: batch.plannedQuantity.toString(),
    actualQuantity: batch.actualQuantity?.toString() ?? null,
    unitCode: batch.unit.code,
    producedOn: batch.producedOn,
    createdAt: batch.createdAt,
  };
}

const batchLinesSelect = {
  orderBy: {position: "asc"},
  select: {
    id: true,
    itemId: true,
    item: {
      select: {
        code: true,
        name: true,
        type: true,
        stockUnit: {
          select: {id: true, code: true, kind: true, factorToBase: true},
        },
      },
    },
    quantity: true,
    unitId: true,
    unit: {select: {code: true, kind: true, factorToBase: true}},
    lossPct: true,
    isOptional: true,
    position: true,
    note: true,
  },
} as const;

const batchOperationsSelect = {
  orderBy: {position: "asc"},
  select: {
    id: true,
    name: true,
    description: true,
    position: true,
    durationMinutes: true,
    activeMinutes: true,
    equipmentId: true,
    equipment: {select: {name: true, powerKw: true, siteId: true}},
    labourRateId: true,
    labourRate: {select: {label: true}},
    requiredSkillId: true,
    requiredSkill: {select: {name: true}},
  },
} as const;

export const productionRepository: ProductionRepository = {
  async listBatches(organizationId) {
    const batches = await prisma.productionBatch.findMany({
      where: {organizationId},
      orderBy: {createdAt: "desc"},
      select: batchSelect,
    });

    return batches.map(toSummary);
  },

  async findBatch(organizationId, id) {
    const batch = await prisma.productionBatch.findFirst({
      where: {id, organizationId},
      select: {
        ...batchSelect,
        recipeVersion: {
          select: {
            ...batchSelect.recipeVersion.select,
            lines: batchLinesSelect,
            operations: batchOperationsSelect,
          },
        },
      },
    });

    if (!batch) return null;

    const lines: RecipeLineRecord[] = batch.recipeVersion.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemCode: line.item.code,
      itemName: line.item.name,
      itemType: line.item.type,
      quantity: line.quantity.toString(),
      unitId: line.unitId,
      unitCode: line.unit.code,
      unitKind: line.unit.kind,
      unitFactorToBase: line.unit.factorToBase.toString(),
      itemStockUnitId: line.item.stockUnit.id,
      itemStockUnitCode: line.item.stockUnit.code,
      itemStockUnitKind: line.item.stockUnit.kind,
      itemStockUnitFactorToBase:
        line.item.stockUnit.factorToBase.toString(),
      lossPct: line.lossPct.toString(),
      isOptional: line.isOptional,
      position: line.position,
      note: line.note,
    }));

    const operations: RecipeOperationRecord[] =
      batch.recipeVersion.operations.map((operation) => ({
        id: operation.id,
        name: operation.name,
        description: operation.description,
        position: operation.position,
        durationMinutes: operation.durationMinutes,
        activeMinutes: operation.activeMinutes,
        equipmentId: operation.equipmentId,
        equipmentName: operation.equipment?.name ?? null,
        equipmentPowerKw: operation.equipment?.powerKw?.toString() ?? null,
        equipmentSiteId: operation.equipment?.siteId ?? null,
        labourRateId: operation.labourRateId,
        labourRateLabel: operation.labourRate?.label ?? null,
        requiredSkillId: operation.requiredSkillId,
        requiredSkillName: operation.requiredSkill?.name ?? null,
      }));

    const inputs: ProductionBatchInputRecord[] = batch.inputs.map((input) => ({
      id: input.id,
      lotId: input.lotId,
      lotNumber: input.lot.lotNumber,
      itemId: input.itemId,
      itemName: input.item.name,
      unitCode: input.unit.code,
      quantity: input.quantity.toString(),
      theoreticalQuantity: input.theoreticalQuantity?.toString() ?? null,
      unitCost: input.unitCost.toString(),
    }));

    const outputs: ProductionBatchOutputRecord[] = batch.outputs.map(
      (output) => ({
        id: output.id,
        lotId: output.lotId,
        lotNumber: output.lot?.lotNumber ?? null,
        itemId: output.itemId,
        itemName: output.item.name,
        quantity: output.quantity.toString(),
        unitCode: output.unit.code,
        isPrimary: output.isPrimary,
        costPerUnit: output.costPerUnit?.toString() ?? null,
      }),
    );

    return {
      ...toSummary(batch),
      siteId: batch.siteId,
      recipeId: batch.recipeVersion.recipe.id,
      recipeVersionId: batch.recipeVersionId,
      recipeVersionNumber: batch.recipeVersion.versionNumber,
      recipeYieldQuantity: batch.recipeVersion.yieldQuantity.toString(),
      recipeYieldUnitId: batch.recipeVersion.yieldUnitId,
      recipeYieldUnitCode: batch.recipeVersion.yieldUnit.code,
      recipeYieldUnitKind: batch.recipeVersion.yieldUnit.kind,
      recipeYieldUnitFactorToBase:
        batch.recipeVersion.yieldUnit.factorToBase.toString(),
      outputItemId: batch.recipeVersion.recipe.outputItem.id,
      outputItemName: batch.recipeVersion.recipe.outputItem.name,
      outputSalePrice:
        batch.recipeVersion.recipe.outputItem.salePrice?.toString() ?? null,
      outputStockUnitId:
        batch.recipeVersion.recipe.outputItem.stockUnit.id,
      outputStockUnitCode:
        batch.recipeVersion.recipe.outputItem.stockUnit.code,
      outputStockUnitKind:
        batch.recipeVersion.recipe.outputItem.stockUnit.kind,
      outputStockUnitFactorToBase:
        batch.recipeVersion.recipe.outputItem.stockUnit.factorToBase.toString(),
      outputShelfLifeDays:
        batch.recipeVersion.recipe.outputItem.shelfLifeDays,
      unitId: batch.unitId,
      unitKind: batch.unit.kind,
      unitFactorToBase: batch.unit.factorToBase.toString(),
      plannedStartAt: batch.plannedStartAt,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      note: batch.note,
      inputs,
      outputs,
      recipeLines: lines,
      recipeOperations: operations,
      cost: toCost(batch.costSnapshots[0] ?? null),
    };
  },

  async createBatch(organizationId, input) {
    return withTransaction(async (tx) => {
      const now = new Date();
      const prefix = receiptNumberPrefix(now).replace("GR", "B");
      const existing = await tx.productionBatch.findMany({
        where: {organizationId, code: {startsWith: prefix}},
        select: {code: true},
      });
      const sequence = nextDocumentSequence(
        existing.map((batch) => batch.code),
        prefix,
      );

      const batch = await tx.productionBatch.create({
        data: {
          organizationId,
          ...input,
          code: `${prefix}-${String(sequence).padStart(3, "0")}`,
          status: "PLANNED",
        },
        select: {id: true},
      });

      return batch.id;
    });
  },

  async startBatch(organizationId, id) {
    const result = await prisma.productionBatch.updateMany({
      where: {id, organizationId, status: "PLANNED"},
      data: {status: "IN_PROGRESS", startedAt: new Date()},
    });

    if (result.count === 0) throw new DomainError("INVALID_STATE_TRANSITION");
  },

  async cancelBatch(organizationId, id) {
    const result = await prisma.productionBatch.updateMany({
      where: {
        id,
        organizationId,
        status: {in: ["PLANNED", "IN_PROGRESS"]},
      },
      data: {status: "CANCELLED"},
    });

    if (result.count === 0) throw new DomainError("INVALID_STATE_TRANSITION");
  },

  async listAvailableLots(organizationId, siteId, itemIds) {
    if (itemIds.length === 0) return [];

    const lots = await prisma.lot.findMany({
      where: {
        organizationId,
        siteId,
        itemId: {in: [...itemIds]},
        status: "AVAILABLE",
        quantityRemaining: {gt: 0},
      },
      orderBy: [{expiresOn: "asc"}, {receivedAt: "asc"}],
      select: {
        id: true,
        lotNumber: true,
        itemId: true,
        item: {
          select: {
            name: true,
            type: true,
            stockUnit: {
              select: {id: true, code: true, kind: true, factorToBase: true},
            },
          },
        },
        quantityRemaining: true,
        unitCost: true,
        expiresOn: true,
        receivedAt: true,
      },
    });

    return lots.map((lot) => ({
      id: lot.id,
      lotNumber: lot.lotNumber,
      itemId: lot.itemId,
      itemName: lot.item.name,
      itemType: lot.item.type,
      quantityRemaining: lot.quantityRemaining.toString(),
      unitCost: lot.unitCost.toString(),
      unitId: lot.item.stockUnit.id,
      unitCode: lot.item.stockUnit.code,
      unitKind: lot.item.stockUnit.kind,
      unitFactorToBase: lot.item.stockUnit.factorToBase.toString(),
      expiresOn: lot.expiresOn,
      receivedAt: lot.receivedAt,
    }));
  },

  async complete(organizationId, batchId, plan, userId) {
    await withTransaction(async (tx) => {
      const batch = await tx.productionBatch.findFirst({
        where: {id: batchId, organizationId},
        select: {
          id: true,
          status: true,
          siteId: true,
          unitId: true,
          startedAt: true,
          site: {select: {code: true}},
        },
      });

      if (!batch) throw new DomainError("NOT_FOUND");
      if (batch.status !== "PLANNED" && batch.status !== "IN_PROGRESS") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const settings = await tx.organizationSetting.findUnique({
        where: {organizationId},
        select: {lotNumberPattern: true},
      });
      const pattern = settings?.lotNumberPattern ?? "{site}-{yyMMdd}-{seq}";

      const dayStart = new Date(plan.producedOn);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      const existing = await tx.lot.count({
        where: {
          organizationId,
          siteId: batch.siteId,
          receivedAt: {gte: dayStart, lt: dayEnd},
        },
      });

      const lotNumber = buildLotNumber(pattern, {
        siteCode: batch.site.code,
        date: plan.producedOn,
        sequence: existing + 1,
      });

      for (const input of plan.inputs) {
        const decremented = await tx.lot.updateMany({
          where: {
            id: input.lotId,
            organizationId,
            quantityRemaining: {gte: input.quantity},
          },
          data: {quantityRemaining: {decrement: input.quantity}},
        });

        if (decremented.count === 0) {
          throw new DomainError(
            "INSUFFICIENT_STOCK",
            `Lot ${input.lotId} no longer has enough stock.`,
          );
        }

        await tx.productionBatchInput.create({
          data: {
            organizationId,
            productionBatchId: batchId,
            lotId: input.lotId,
            itemId: input.itemId,
            quantity: input.quantity,
            theoreticalQuantity: input.theoreticalQuantity,
            unitId: input.unitId,
            unitCost: input.unitCost,
          },
        });

        await tx.stockMovement.create({
          data: {
            organizationId,
            siteId: batch.siteId,
            itemId: input.itemId,
            lotId: input.lotId,
            type: "CONSUMPTION",
            quantity: `-${input.quantity}`,
            unitId: input.unitId,
            occurredAt: plan.producedOn,
            referenceType: "PRODUCTION_BATCH",
            referenceId: batchId,
            createdById: userId,
          },
        });
      }

      const lot = await tx.lot.create({
        data: {
          organizationId,
          siteId: batch.siteId,
          itemId: plan.output.itemId,
          productionBatchId: batchId,
          lotNumber,
          receivedAt: new Date(),
          producedOn: plan.producedOn,
          expiresOn: plan.output.expiresOn,
          quantityReceived: plan.output.quantity,
          quantityRemaining: plan.output.quantity,
          unitCost: plan.output.unitCost,
          currency: plan.cost.currency,
          status: "AVAILABLE",
        },
        select: {id: true},
      });

      await tx.productionBatchOutput.create({
        data: {
          organizationId,
          productionBatchId: batchId,
          itemId: plan.output.itemId,
          lotId: lot.id,
          quantity: plan.output.quantity,
          unitId: plan.output.unitId,
          isPrimary: true,
          costPerUnit: plan.output.unitCost,
        },
      });

      await tx.stockMovement.create({
        data: {
          organizationId,
          siteId: batch.siteId,
          itemId: plan.output.itemId,
          lotId: lot.id,
          type: "PRODUCTION_OUTPUT",
          quantity: plan.output.quantity,
          unitId: plan.output.unitId,
          occurredAt: plan.producedOn,
          referenceType: "PRODUCTION_BATCH",
          referenceId: batchId,
          createdById: userId,
        },
      });

      await tx.costSnapshot.create({
        data: {
          organizationId,
          siteId: batch.siteId,
          scope: "PRODUCTION_BATCH",
          productionBatchId: batchId,
          currency: plan.cost.currency,
          materialCost: plan.cost.materialCost,
          packagingCost: plan.cost.packagingCost,
          labourCost: plan.cost.labourCost,
          energyCost: plan.cost.energyCost,
          overheadCost: plan.cost.overheadCost,
          totalCost: plan.cost.totalCost,
          yieldQuantity: plan.cost.yieldQuantity,
          yieldUnitId: plan.cost.yieldUnitId,
          costPerUnit: plan.cost.costPerUnit,
          salePrice: plan.cost.salePrice,
          marginPct: plan.cost.marginPct,
          inputHash: plan.cost.inputHash,
          createdById: userId,
          lines: {
            create: plan.cost.lines.map((line) => ({
              organizationId,
              kind: line.kind,
              itemId: line.itemId,
              lotId: line.lotId,
              recipeOperationId: line.recipeOperationId,
              label: line.label,
              quantity: line.quantity,
              unitId: line.unitId,
              unitCost: line.unitCost,
              amount: line.amount,
              position: line.position,
            })),
          },
        },
      });

      await tx.productionBatch.update({
        where: {id: batchId},
        data: {
          status: "COMPLETED",
          actualQuantity: plan.actualQuantity,
          completedAt: new Date(),
          producedOn: plan.producedOn,
          startedAt: batch.startedAt ?? new Date(),
        },
      });
    });
  },

  async options(organizationId) {
    const [recipes, sites] = await Promise.all([
      prisma.recipe.findMany({
        where: {
          organizationId,
          archivedAt: null,
          currentVersion: {isNot: null},
        },
        orderBy: {name: "asc"},
        select: {
          id: true,
          name: true,
          currentVersionId: true,
          currentVersion: {
            select: {
              id: true,
              versionNumber: true,
              status: true,
              yieldUnitId: true,
              yieldUnit: {select: {code: true}},
            },
          },
          outputItem: {select: {name: true}},
        },
      }),
      prisma.site.findMany({
        where: {organizationId, archivedAt: null},
        orderBy: {name: "asc"},
        select: {id: true, name: true, code: true},
      }),
    ]);

    return {
      recipes: recipes
        .filter(
          (recipe) =>
            recipe.currentVersion?.status === "PUBLISHED" &&
            recipe.currentVersionId !== null,
        )
        .map((recipe) => ({
          recipeId: recipe.id,
          recipeVersionId: recipe.currentVersionId as string,
          name: recipe.name,
          versionNumber: recipe.currentVersion?.versionNumber ?? 0,
          outputItemName: recipe.outputItem.name,
          yieldUnitId: recipe.currentVersion?.yieldUnitId ?? "",
          yieldUnitCode: recipe.currentVersion?.yieldUnit.code ?? "",
        })),
      sites,
    };
  },

  async listWaste(organizationId) {
    const records = await prisma.wasteRecord.findMany({
      where: {organizationId},
      orderBy: {recordedAt: "desc"},
      select: {
        id: true,
        item: {select: {name: true}},
        lot: {select: {lotNumber: true}},
        quantity: true,
        unit: {select: {code: true}},
        costImpact: true,
        currency: true,
        lossReason: {select: {labelEn: true, labelFr: true}},
        recordedAt: true,
        archivedAt: true,
      },
    });

    return records.map((record) => ({
      id: record.id,
      itemName: record.item.name,
      lotNumber: record.lot?.lotNumber ?? "—",
      quantity: record.quantity.toString(),
      unitCode: record.unit.code,
      costImpact: record.costImpact.toString(),
      currency: record.currency,
      reasonLabel:
        record.lossReason.labelEn ?? record.lossReason.labelFr ?? "—",
      recordedAt: record.recordedAt,
      isArchived: record.archivedAt !== null,
    }));
  },

  async wasteOptions(organizationId) {
    const [lots, reasons] = await Promise.all([
      prisma.lot.findMany({
        where: {
          organizationId,
          status: "AVAILABLE",
          quantityRemaining: {gt: 0},
        },
        orderBy: [{expiresOn: "asc"}, {receivedAt: "asc"}],
        select: {
          id: true,
          lotNumber: true,
          itemId: true,
          item: {
            select: {name: true, stockUnit: {select: {id: true, code: true}}},
          },
          quantityRemaining: true,
          unitCost: true,
          currency: true,
        },
      }),
      prisma.lossReason.findMany({
        where: {organizationId, isActive: true},
        orderBy: {sortOrder: "asc"},
        select: {id: true, labelEn: true, labelFr: true},
      }),
    ]);

    return {
      lots: lots.map((lot) => ({
        id: lot.id,
        lotNumber: lot.lotNumber,
        itemName: lot.item.name,
        unitId: lot.item.stockUnit.id,
        unitCode: lot.item.stockUnit.code,
        quantityRemaining: lot.quantityRemaining.toString(),
        unitCost: lot.unitCost.toString(),
        currency: lot.currency,
      })),
      lossReasons: reasons.map((reason) => ({
        id: reason.id,
        labelEn: reason.labelEn ?? reason.labelFr,
        labelFr: reason.labelFr,
      })),
    };
  },

  async recordWaste(organizationId, input, userId) {
    await withTransaction(async (tx) => {
      const lot = await tx.lot.findFirst({
        where: {id: input.lotId, organizationId},
        select: {
          id: true,
          itemId: true,
          siteId: true,
          item: {select: {stockUnit: {select: {id: true, code: true}}}},
          unitCost: true,
          currency: true,
          quantityRemaining: true,
        },
      });
      if (!lot) throw new DomainError("NOT_FOUND");

      const decremented = await tx.lot.updateMany({
        where: {
          id: lot.id,
          organizationId,
          quantityRemaining: {gte: input.quantity},
        },
        data: {quantityRemaining: {decrement: input.quantity}},
      });
      if (decremented.count === 0) {
        throw new DomainError("INSUFFICIENT_STOCK");
      }

      const costImpact = new Decimal(input.quantity)
        .mul(lot.unitCost.toString())
        .toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
        .toString();

      const waste = await tx.wasteRecord.create({
        data: {
          organizationId,
          siteId: lot.siteId,
          itemId: lot.itemId,
          lotId: lot.id,
          lossReasonId: input.lossReasonId,
          quantity: input.quantity,
          unitId: lot.item.stockUnit.id,
          costImpact,
          currency: lot.currency,
          recordedAt: input.recordedAt,
          recordedById: userId,
          note: input.reason,
        },
        select: {id: true},
      });

      await tx.stockMovement.create({
        data: {
          organizationId,
          siteId: lot.siteId,
          itemId: lot.itemId,
          lotId: lot.id,
          type: "WASTE",
          quantity: `-${input.quantity}`,
          unitId: lot.item.stockUnit.id,
          occurredAt: input.recordedAt,
          referenceType: "WASTE_RECORD",
          referenceId: waste.id,
          reason: input.reason,
          createdById: userId,
        },
      });
    });
  },

  async archiveWaste(organizationId, id) {
    await withTransaction(async (tx) => {
      const waste = await tx.wasteRecord.findFirst({
        where: {id, organizationId, archivedAt: null},
        select: {
          id: true,
          siteId: true,
          itemId: true,
          lotId: true,
          quantity: true,
          unitId: true,
          recordedAt: true,
        },
      });
      if (!waste) throw new DomainError("NOT_FOUND");
      if (!waste.lotId) throw new DomainError("INVALID_STATE_TRANSITION");

      await tx.wasteRecord.update({
        where: {id: waste.id},
        data: {archivedAt: new Date()},
      });

      await tx.lot.update({
        where: {id: waste.lotId},
        data: {quantityRemaining: {increment: waste.quantity}},
      });

      await tx.stockMovement.create({
        data: {
          organizationId,
          siteId: waste.siteId,
          itemId: waste.itemId,
          lotId: waste.lotId,
          type: "WASTE",
          quantity: waste.quantity,
          unitId: waste.unitId,
          occurredAt: new Date(),
          referenceType: "WASTE_RECORD",
          referenceId: waste.id,
          reason: "Waste record archived",
        },
      });
    });
  },

  async trace(organizationId, lotId) {
    const lot = await prisma.lot.findFirst({
      where: {id: lotId, organizationId},
      select: {
        id: true,
        lotNumber: true,
        purchaseReceiptLine: {
          select: {
            purchaseReceipt: {
              select: {number: true, supplier: {select: {name: true}}},
            },
          },
        },
        productionBatch: {
          select: {
            code: true,
            inputs: {
              select: {
                lot: {
                  select: {
                    lotNumber: true,
                    supplierLotNumber: true,
                    item: {select: {name: true}},
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!lot) return null;

    const [consumedBy, dispatchLines, wasteRecords] = await Promise.all([
      prisma.productionBatch.findMany({
        where: {organizationId, inputs: {some: {lotId}}},
        orderBy: {createdAt: "desc"},
        select: {
          id: true,
          code: true,
          outputs: {
            select: {
              lot: {select: {lotNumber: true}},
              item: {select: {name: true}},
            },
          },
        },
      }),
      prisma.dispatchLine.findMany({
        where: {
          organizationId,
          lotId,
          dispatch: {status: "DISPATCHED"},
        },
        orderBy: {createdAt: "desc"},
        select: {
          quantity: true,
          unit: {select: {code: true}},
          dispatch: {
            select: {
              id: true,
              number: true,
              dispatchedAt: true,
              customer: {select: {name: true}},
            },
          },
        },
      }),
      prisma.wasteRecord.findMany({
        where: {organizationId, lotId, archivedAt: null},
        orderBy: {recordedAt: "desc"},
        select: {
          id: true,
          quantity: true,
          recordedAt: true,
          unit: {select: {code: true}},
          lossReason: {select: {labelEn: true, labelFr: true}},
        },
      }),
    ]);

    const source = lot.purchaseReceiptLine
      ? {
          type: "RECEIPT" as const,
          label: `${lot.purchaseReceiptLine.purchaseReceipt.supplier.name} · ${lot.purchaseReceiptLine.purchaseReceipt.number}`,
        }
      : lot.productionBatch
        ? {type: "BATCH" as const, label: lot.productionBatch.code}
        : null;

    return {
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      source,
      sourceLots:
        lot.productionBatch?.inputs.map((input) => ({
          lotNumber: input.lot.lotNumber,
          itemName: input.lot.item.name,
          supplierLotNumber: input.lot.supplierLotNumber,
        })) ?? [],
      consumedBy: consumedBy.map((batch) => ({
        batchId: batch.id,
        batchCode: batch.code,
        outputs: batch.outputs.flatMap((output) =>
          output.lot
            ? [{lotNumber: output.lot.lotNumber, itemName: output.item.name}]
            : [],
        ),
      })),
      dispatchedTo: dispatchLines.map((line) => ({
        dispatchId: line.dispatch.id,
        number: line.dispatch.number,
        customerName: line.dispatch.customer?.name ?? null,
        quantity: line.quantity.toString(),
        unitCode: line.unit.code,
        dispatchedAt: line.dispatch.dispatchedAt,
      })),
      waste: wasteRecords.map((record) => ({
        id: record.id,
        quantity: record.quantity.toString(),
        unitCode: record.unit.code,
        reason: record.lossReason.labelEn ?? record.lossReason.labelFr,
        recordedAt: record.recordedAt,
      })),
    };
  },
};
