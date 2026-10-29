import {prisma} from "@/lib/prisma";
import {DomainError} from "@/server/domain/errors";
import type {
  RecipeCostLineRecord,
  RecipeCostRecord,
  RecipeDetailRecord,
  RecipeLineRecord,
  RecipeListRecord,
  RecipeOperationRecord,
  RecipeStatusName,
  RecipeVersionDetailRecord,
  RecipeVersionSummary,
} from "@/lib/dto";
import {withTransaction} from "./transaction";

export type RecipeIdentityInput = {
  code: string;
  name: string;
  description: string | null;
  outputItemId: string;
};

export type RecipeVersionInput = {
  yieldQuantity: string;
  yieldUnitId: string;
  portionCount: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  instructions: string | null;
  changeNote: string | null;
};

export type RecipeLineInput = {
  itemId: string;
  quantity: string;
  unitId: string;
  lossPct: string;
  isOptional: boolean;
  note: string | null;
};

export type RecipeOperationInput = {
  name: string;
  description: string | null;
  durationMinutes: number;
  activeMinutes: number | null;
  equipmentId: string | null;
  labourRateId: string | null;
  requiredSkillId: string | null;
};

export type CostSnapshotLineInput = {
  kind: "MATERIAL" | "PACKAGING" | "LABOUR" | "ENERGY" | "OVERHEAD";
  itemId: string | null;
  lotId: string | null;
  recipeOperationId: string | null;
  label: string;
  quantity: string | null;
  unitId: string | null;
  unitCost: string | null;
  amount: string;
  position: number;
};

export type CostSnapshotInput = {
  currency: string;
  materialCost: string;
  packagingCost: string;
  labourCost: string;
  energyCost: string;
  overheadCost: string;
  totalCost: string;
  yieldQuantity: string;
  yieldUnitId: string;
  costPerUnit: string;
  salePrice: string | null;
  marginPct: string | null;
  inputHash: string | null;
  lines: CostSnapshotLineInput[];
};

export interface RecipeRepository {
  list(organizationId: string): Promise<RecipeListRecord[]>;
  findRecipe(
    organizationId: string,
    id: string,
  ): Promise<RecipeDetailRecord | null>;
  findRecipeSummary(
    organizationId: string,
    id: string,
  ): Promise<{id: string; outputItemId: string} | null>;
  createWithVersion(
    organizationId: string,
    input: RecipeIdentityInput,
    initialYieldUnitId: string,
  ): Promise<{recipeId: string; versionId: string}>;
  updateIdentity(
    organizationId: string,
    id: string,
    input: RecipeIdentityInput,
  ): Promise<boolean>;
  archive(organizationId: string, id: string): Promise<boolean>;
  createVersion(
    organizationId: string,
    recipeId: string,
    sourceVersionId: string | null,
  ): Promise<string>;
  updateVersion(
    organizationId: string,
    versionId: string,
    input: RecipeVersionInput,
  ): Promise<boolean>;
  addLine(
    organizationId: string,
    versionId: string,
    input: RecipeLineInput,
  ): Promise<void>;
  removeLine(
    organizationId: string,
    versionId: string,
    lineId: string,
  ): Promise<void>;
  addOperation(
    organizationId: string,
    versionId: string,
    input: RecipeOperationInput,
  ): Promise<void>;
  removeOperation(
    organizationId: string,
    versionId: string,
    operationId: string,
  ): Promise<void>;
  findVersion(
    organizationId: string,
    versionId: string,
  ): Promise<RecipeVersionDetailRecord | null>;
  publish(
    organizationId: string,
    versionId: string,
    snapshot: CostSnapshotInput,
  ): Promise<void>;
  addCostSnapshot(
    organizationId: string,
    versionId: string,
    snapshot: CostSnapshotInput,
    createdById: string | null,
  ): Promise<void>;
  listPublishedVersionIds(organizationId: string): Promise<string[]>;
  listGraph(
    organizationId: string,
  ): Promise<{outputItemId: string; lineItemIds: string[]}[]>;
}

function summaryCost(
  snapshots: Array<{
    costPerUnit: {toString(): string};
    currency: string;
    marginPct: {toString(): string} | null;
  }>,
) {
  const snapshot = snapshots[0];
  return snapshot
    ? {
        costPerUnit: snapshot.costPerUnit.toString(),
        currency: snapshot.currency,
        marginPct: snapshot.marginPct?.toString() ?? null,
      }
    : {costPerUnit: null, currency: null, marginPct: null};
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
    isStale: snapshot.inputHash === null,
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

export const recipeRepository: RecipeRepository = {
  async list(organizationId) {
    const recipes = await prisma.recipe.findMany({
      where: {organizationId},
      orderBy: [{archivedAt: "asc"}, {name: "asc"}],
      select: {
        id: true,
        code: true,
        name: true,
        archivedAt: true,
        outputItem: {select: {name: true}},
        currentVersion: {
          select: {
            versionNumber: true,
            status: true,
            costSnapshots: {
              orderBy: {computedAt: "desc"},
              take: 1,
              select: {costPerUnit: true, currency: true, marginPct: true},
            },
          },
        },
      },
    });

    return recipes.map((recipe) => {
      const cost = summaryCost(recipe.currentVersion?.costSnapshots ?? []);
      return {
        id: recipe.id,
        code: recipe.code,
        name: recipe.name,
        outputItemName: recipe.outputItem.name,
        versionNumber: recipe.currentVersion?.versionNumber ?? null,
        status:
          (recipe.currentVersion?.status as RecipeStatusName | undefined) ??
          null,
        costPerUnit: cost.costPerUnit,
        currency: cost.currency,
        marginPct: cost.marginPct,
        isArchived: recipe.archivedAt !== null,
      };
    });
  },

  async findRecipe(organizationId, id) {
    const recipe = await prisma.recipe.findFirst({
      where: {id, organizationId},
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        outputItemId: true,
        outputItem: {select: {name: true, type: true}},
        currentVersionId: true,
        archivedAt: true,
        versions: {
          orderBy: {versionNumber: "desc"},
          select: {
            id: true,
            versionNumber: true,
            status: true,
            yieldQuantity: true,
            yieldUnit: {select: {code: true}},
            portionCount: true,
            publishedAt: true,
            createdAt: true,
            costSnapshots: {
              orderBy: {computedAt: "desc"},
              take: 1,
              select: {costPerUnit: true, currency: true, marginPct: true},
            },
          },
        },
      },
    });

    if (!recipe) return null;

    const versions: RecipeVersionSummary[] = recipe.versions.map((version) => {
      const cost = summaryCost(version.costSnapshots);
      return {
        id: version.id,
        versionNumber: version.versionNumber,
        status: version.status as RecipeStatusName,
        yieldQuantity: version.yieldQuantity.toString(),
        yieldUnitCode: version.yieldUnit.code,
        portionCount: version.portionCount,
        publishedAt: version.publishedAt,
        createdAt: version.createdAt,
        costPerUnit: cost.costPerUnit,
        currency: cost.currency,
        marginPct: cost.marginPct,
      };
    });

    return {
      id: recipe.id,
      code: recipe.code,
      name: recipe.name,
      description: recipe.description,
      outputItemId: recipe.outputItemId,
      outputItemName: recipe.outputItem.name,
      outputItemType: recipe.outputItem.type,
      currentVersionId: recipe.currentVersionId,
      isArchived: recipe.archivedAt !== null,
      versions,
    };
  },

  async findRecipeSummary(organizationId, id) {
    return prisma.recipe.findFirst({
      where: {id, organizationId},
      select: {id: true, outputItemId: true},
    });
  },

  async createWithVersion(organizationId, input, initialYieldUnitId) {
    return withTransaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          organizationId,
          code: input.code,
          name: input.name,
          description: input.description,
          outputItemId: input.outputItemId,
        },
        select: {id: true},
      });

      const version = await tx.recipeVersion.create({
        data: {
          organizationId,
          recipeId: recipe.id,
          versionNumber: 1,
          status: "DRAFT",
          yieldQuantity: "1",
          yieldUnitId: initialYieldUnitId,
        },
        select: {id: true},
      });

      return {recipeId: recipe.id, versionId: version.id};
    });
  },

  async updateIdentity(organizationId, id, input) {
    const result = await prisma.recipe.updateMany({
      where: {id, organizationId},
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        outputItemId: input.outputItemId,
      },
    });

    return result.count > 0;
  },

  async archive(organizationId, id) {
    const result = await prisma.recipe.updateMany({
      where: {id, organizationId, archivedAt: null},
      data: {archivedAt: new Date()},
    });

    return result.count > 0;
  },

  async createVersion(organizationId, recipeId, sourceVersionId) {
    return withTransaction(async (tx) => {
      const recipe = await tx.recipe.findFirst({
        where: {id: recipeId, organizationId},
        select: {id: true, outputItem: {select: {stockUnitId: true}}},
      });
      if (!recipe) throw new DomainError("NOT_FOUND");

      const latest = await tx.recipeVersion.findFirst({
        where: {recipeId},
        orderBy: {versionNumber: "desc"},
        select: {versionNumber: true},
      });
      const versionNumber = (latest?.versionNumber ?? 0) + 1;

      const source = sourceVersionId
        ? await tx.recipeVersion.findFirst({
            where: {id: sourceVersionId, recipeId, organizationId},
            select: {
              yieldQuantity: true,
              yieldUnitId: true,
              portionCount: true,
              prepMinutes: true,
              cookMinutes: true,
              instructions: true,
              lines: {
                select: {
                  itemId: true,
                  quantity: true,
                  unitId: true,
                  lossPct: true,
                  isOptional: true,
                  position: true,
                  note: true,
                },
              },
              operations: {
                select: {
                  name: true,
                  description: true,
                  durationMinutes: true,
                  activeMinutes: true,
                  temperatureC: true,
                  estimatedQuantity: true,
                  equipmentId: true,
                  labourRateId: true,
                  position: true,
                },
              },
            },
          })
        : null;

      if (sourceVersionId && !source) throw new DomainError("NOT_FOUND");

      const version = await tx.recipeVersion.create({
        data: {
          organizationId,
          recipeId,
          versionNumber,
          status: "DRAFT",
          yieldQuantity: source?.yieldQuantity ?? "1",
          yieldUnitId: source?.yieldUnitId ?? recipe.outputItem.stockUnitId,
          portionCount: source?.portionCount ?? null,
          prepMinutes: source?.prepMinutes ?? null,
          cookMinutes: source?.cookMinutes ?? null,
          instructions: source?.instructions ?? null,
          lines: source
            ? {
                create: source.lines.map((line) => ({
                  organizationId,
                  itemId: line.itemId,
                  quantity: line.quantity,
                  unitId: line.unitId,
                  lossPct: line.lossPct,
                  isOptional: line.isOptional,
                  position: line.position,
                  note: line.note,
                })),
              }
            : undefined,
          operations: source
            ? {
                create: source.operations.map((operation) => ({
                  organizationId,
                  name: operation.name,
                  description: operation.description,
                  durationMinutes: operation.durationMinutes,
                  activeMinutes: operation.activeMinutes,
                  temperatureC: operation.temperatureC,
                  estimatedQuantity: operation.estimatedQuantity,
                  equipmentId: operation.equipmentId,
                  labourRateId: operation.labourRateId,
                  position: operation.position,
                })),
              }
            : undefined,
        },
        select: {id: true},
      });

      return version.id;
    });
  },

  async updateVersion(organizationId, versionId, input) {
    const result = await prisma.recipeVersion.updateMany({
      where: {id: versionId, organizationId, status: "DRAFT"},
      data: input,
    });

    return result.count > 0;
  },

  async addLine(organizationId, versionId, input) {
    await withTransaction(async (tx) => {
      const version = await tx.recipeVersion.findFirst({
        where: {id: versionId, organizationId},
        select: {status: true},
      });
      if (!version) throw new DomainError("NOT_FOUND");
      if (version.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const max = await tx.recipeLine.aggregate({
        where: {recipeVersionId: versionId},
        _max: {position: true},
      });

      await tx.recipeLine.create({
        data: {
          organizationId,
          recipeVersionId: versionId,
          ...input,
          position: (max._max.position ?? 0) + 1,
        },
      });
    });
  },

  async removeLine(organizationId, versionId, lineId) {
    await withTransaction(async (tx) => {
      const version = await tx.recipeVersion.findFirst({
        where: {id: versionId, organizationId},
        select: {status: true},
      });
      if (!version) throw new DomainError("NOT_FOUND");
      if (version.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const result = await tx.recipeLine.deleteMany({
        where: {id: lineId, recipeVersionId: versionId, organizationId},
      });
      if (result.count === 0) throw new DomainError("NOT_FOUND");
    });
  },

  async addOperation(organizationId, versionId, input) {
    await withTransaction(async (tx) => {
      const version = await tx.recipeVersion.findFirst({
        where: {id: versionId, organizationId},
        select: {status: true},
      });
      if (!version) throw new DomainError("NOT_FOUND");
      if (version.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const max = await tx.recipeOperation.aggregate({
        where: {recipeVersionId: versionId},
        _max: {position: true},
      });

      await tx.recipeOperation.create({
        data: {
          organizationId,
          recipeVersionId: versionId,
          ...input,
          position: (max._max.position ?? 0) + 1,
        },
      });
    });
  },

  async removeOperation(organizationId, versionId, operationId) {
    await withTransaction(async (tx) => {
      const version = await tx.recipeVersion.findFirst({
        where: {id: versionId, organizationId},
        select: {status: true},
      });
      if (!version) throw new DomainError("NOT_FOUND");
      if (version.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const result = await tx.recipeOperation.deleteMany({
        where: {
          id: operationId,
          recipeVersionId: versionId,
          organizationId,
        },
      });
      if (result.count === 0) throw new DomainError("NOT_FOUND");
    });
  },

  async findVersion(organizationId, versionId) {
    const version = await prisma.recipeVersion.findFirst({
      where: {id: versionId, organizationId},
      select: {
        id: true,
        recipeId: true,
        versionNumber: true,
        status: true,
        yieldQuantity: true,
        yieldUnitId: true,
        yieldUnit: {select: {code: true}},
        portionCount: true,
        prepMinutes: true,
        cookMinutes: true,
        instructions: true,
        changeNote: true,
        publishedAt: true,
        recipe: {
          select: {
            id: true,
            code: true,
            name: true,
            outputItem: {
              select: {
                id: true,
                name: true,
                type: true,
                salePrice: true,
                stockUnitId: true,
                stockUnit: {select: {code: true, kind: true}},
              },
            },
          },
        },
        lines: {
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
                  select: {
                    id: true,
                    code: true,
                    kind: true,
                    factorToBase: true,
                  },
                },
              },
            },
            quantity: true,
            unitId: true,
            unit: {
              select: {code: true, kind: true, factorToBase: true},
            },
            lossPct: true,
            isOptional: true,
            position: true,
            note: true,
          },
        },
        operations: {
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
      },
    });

    if (!version) return null;

    const settings = await prisma.organizationSetting.findUnique({
      where: {organizationId},
      select: {currency: true},
    });

    const lines: RecipeLineRecord[] = version.lines.map((line) => ({
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

    const operations: RecipeOperationRecord[] = version.operations.map(
      (operation) => ({
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
      }),
    );

    const snapshot = version.costSnapshots[0] ?? null;

    return {
      id: version.id,
      recipeId: version.recipeId,
      recipeCode: version.recipe.code,
      recipeName: version.recipe.name,
      versionNumber: version.versionNumber,
      status: version.status as RecipeStatusName,
      yieldQuantity: version.yieldQuantity.toString(),
      yieldUnitId: version.yieldUnitId,
      yieldUnitCode: version.yieldUnit.code,
      portionCount: version.portionCount,
      prepMinutes: version.prepMinutes,
      cookMinutes: version.cookMinutes,
      instructions: version.instructions,
      changeNote: version.changeNote,
      publishedAt: version.publishedAt,
      outputItemId: version.recipe.outputItem.id,
      outputItemName: version.recipe.outputItem.name,
      outputItemType: version.recipe.outputItem.type,
      outputStockUnitId: version.recipe.outputItem.stockUnitId,
      outputStockUnitCode: version.recipe.outputItem.stockUnit.code,
      outputStockUnitKind: version.recipe.outputItem.stockUnit.kind,
      salePrice: version.recipe.outputItem.salePrice?.toString() ?? null,
      currency: snapshot?.currency ?? settings?.currency ?? "EUR",
      lines,
      operations,
      cost: toCost(snapshot),
    };
  },

  async publish(organizationId, versionId, snapshot) {
    await withTransaction(async (tx) => {
      const version = await tx.recipeVersion.findFirst({
        where: {id: versionId, organizationId},
        select: {id: true, recipeId: true, status: true},
      });
      if (!version) throw new DomainError("NOT_FOUND");
      if (version.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      await tx.recipeVersion.updateMany({
        where: {
          recipeId: version.recipeId,
          status: "PUBLISHED",
          id: {not: version.id},
        },
        data: {status: "ARCHIVED"},
      });

      const publishedAt = new Date();
      await tx.recipeVersion.update({
        where: {id: version.id},
        data: {status: "PUBLISHED", publishedAt},
      });

      await tx.recipe.update({
        where: {id: version.recipeId},
        data: {currentVersionId: version.id},
      });

      await tx.costSnapshot.create({
        data: {
          organizationId,
          scope: "RECIPE_VERSION",
          recipeVersionId: version.id,
          currency: snapshot.currency,
          materialCost: snapshot.materialCost,
          packagingCost: snapshot.packagingCost,
          labourCost: snapshot.labourCost,
          energyCost: snapshot.energyCost,
          overheadCost: snapshot.overheadCost,
          totalCost: snapshot.totalCost,
          yieldQuantity: snapshot.yieldQuantity,
          yieldUnitId: snapshot.yieldUnitId,
          costPerUnit: snapshot.costPerUnit,
          salePrice: snapshot.salePrice,
          marginPct: snapshot.marginPct,
          inputHash: snapshot.inputHash,
          lines: {
            create: snapshot.lines.map((line) => ({
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
    });
  },

  async addCostSnapshot(
    organizationId,
    versionId,
    snapshot,
    createdById,
  ) {
    await prisma.costSnapshot.create({
      data: {
        organizationId,
        scope: "RECIPE_VERSION",
        recipeVersionId: versionId,
        createdById,
        currency: snapshot.currency,
        materialCost: snapshot.materialCost,
        packagingCost: snapshot.packagingCost,
        labourCost: snapshot.labourCost,
        energyCost: snapshot.energyCost,
        overheadCost: snapshot.overheadCost,
        totalCost: snapshot.totalCost,
        yieldQuantity: snapshot.yieldQuantity,
        yieldUnitId: snapshot.yieldUnitId,
        costPerUnit: snapshot.costPerUnit,
        salePrice: snapshot.salePrice,
        marginPct: snapshot.marginPct,
        inputHash: snapshot.inputHash,
        lines: {
          create: snapshot.lines.map((line) => ({
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
  },

  async listPublishedVersionIds(organizationId) {
    const versions = await prisma.recipeVersion.findMany({
      where: {
        organizationId,
        status: "PUBLISHED",
        recipe: {archivedAt: null},
      },
      orderBy: [{recipeId: "asc"}, {versionNumber: "desc"}],
      select: {id: true},
    });

    return versions.map((version) => version.id);
  },

  async listGraph(organizationId) {
    const recipes = await prisma.recipe.findMany({
      where: {organizationId, archivedAt: null},
      select: {
        outputItemId: true,
        currentVersion: {select: {lines: {select: {itemId: true}}}},
        versions: {
          orderBy: {versionNumber: "desc"},
          take: 1,
          select: {lines: {select: {itemId: true}}},
        },
      },
    });

    return recipes.map((recipe) => ({
      outputItemId: recipe.outputItemId,
      lineItemIds:
        recipe.currentVersion?.lines.map((line) => line.itemId) ??
        recipe.versions[0]?.lines.map((line) => line.itemId) ??
        [],
    }));
  },
};
