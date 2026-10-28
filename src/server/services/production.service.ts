
import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor, OrganizationActor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import {computeCosting} from "@/server/domain/costing";
import {
  allocateFefo,
  scaleRequirement,
} from "@/server/domain/production";
import {convertQuantity, roundQuantity} from "@/server/domain/units";
import type {
  LotTraceRecord,
  ProductionBatchDetailRecord,
  ProductionBatchSummaryRecord,
  ProductionOptions,
  WasteOptions,
  WasteRecordSummary,
} from "@/lib/dto";
import type {
  BatchCompletionInput,
  ProductionRepository,
} from "@/server/repositories/production.repository";
import type {CostingRepository} from "@/server/repositories/costing.repository";
import type {CostSnapshotInput} from "@/server/repositories/recipe.repository";

export type CreateBatchValues = {
  siteId: string;
  recipeVersionId: string;
  plannedQuantity: string;
  plannedStartAt: Date | null;
  note: string | null;
};

export type CompleteBatchValues = {
  actualQuantity: string;
  producedOn: Date | null;
};

export type WasteValues = {
  lotId: string;
  lossReasonId: string;
  quantity: string;
  reason: string | null;
  recordedAt: Date;
};

export interface ProductionService {
  getBatches(actor: Actor | null): Promise<{
    batches: ProductionBatchSummaryRecord[];
    canWrite: boolean;
    canExecute: boolean;
  }>;
  getBatch(
    actor: Actor | null,
    id: string,
  ): Promise<{
    batch: ProductionBatchDetailRecord;
    canWrite: boolean;
    canExecute: boolean;
  } | null>;
  getOptions(actor: Actor | null): Promise<ProductionOptions>;
  createBatch(
    actor: Actor | null,
    input: CreateBatchValues,
  ): Promise<{id: string}>;
  startBatch(actor: Actor | null, id: string): Promise<void>;
  cancelBatch(actor: Actor | null, id: string): Promise<void>;
  completeBatch(
    actor: Actor | null,
    id: string,
    input: CompleteBatchValues,
  ): Promise<void>;
  getWaste(actor: Actor | null): Promise<WasteRecordSummary[]>;
  getWasteOptions(actor: Actor | null): Promise<WasteOptions>;
  recordWaste(actor: Actor | null, input: WasteValues): Promise<void>;
  archiveWaste(actor: Actor | null, id: string): Promise<void>;
  getTrace(actor: Actor | null, lotId: string): Promise<LotTraceRecord | null>;
}

function executeAllowed(actor: OrganizationActor): boolean {
  return isGranted(actor, "production:execute");
}

export function createProductionService(deps: {
  productionRepository: ProductionRepository;
  costingRepository: CostingRepository;
}): ProductionService {
  async function requireBatch(
    organizationId: string,
    id: string,
  ): Promise<ProductionBatchDetailRecord> {
    const batch = await deps.productionRepository.findBatch(
      organizationId,
      id,
    );
    if (!batch) throw new DomainError("NOT_FOUND");
    return batch;
  }

  return {
    async getBatches(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:read");

      return {
        batches: await deps.productionRepository.listBatches(
          actor.organizationId,
        ),
        canWrite: isGranted(actor, "production:write"),
        canExecute: executeAllowed(actor),
      };
    },

    async getBatch(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:read");

      const batch = await deps.productionRepository.findBatch(
        actor.organizationId,
        id,
      );
      if (!batch) return null;

      return {
        batch,
        canWrite: isGranted(actor, "production:write"),
        canExecute: executeAllowed(actor),
      };
    },

    async getOptions(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:read");

      return deps.productionRepository.options(actor.organizationId);
    },

    async createBatch(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:write");

      if (Number(input.plannedQuantity) <= 0) {
        throw new DomainError("INVALID_INPUT");
      }

      const options = await deps.productionRepository.options(
        actor.organizationId,
      );
      const recipe = options.recipes.find(
        (candidate) => candidate.recipeVersionId === input.recipeVersionId,
      );
      const site = options.sites.find(
        (candidate) => candidate.id === input.siteId,
      );
      if (!recipe || !site) throw new DomainError("NOT_FOUND");

      return {
        id: await deps.productionRepository.createBatch(
          actor.organizationId,
          {
            siteId: input.siteId,
            recipeVersionId: input.recipeVersionId,
            plannedQuantity: input.plannedQuantity,
            unitId: recipe.yieldUnitId,
            plannedStartAt: input.plannedStartAt,
            note: input.note,
          },
        ),
      };
    },

    async startBatch(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:execute");

      await deps.productionRepository.startBatch(actor.organizationId, id);
    },

    async cancelBatch(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:write");

      await deps.productionRepository.cancelBatch(actor.organizationId, id);
    },

    async completeBatch(actorInput, id, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "production:execute");

      const batch = await requireBatch(actor.organizationId, id);
      if (batch.status !== "PLANNED" && batch.status !== "IN_PROGRESS") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }
      if (batch.recipeLines.length === 0) {
        throw new DomainError("INVALID_INPUT", "The recipe has no lines.");
      }

      const actualQuantity = Number(input.actualQuantity);
      if (!Number.isFinite(actualQuantity) || actualQuantity <= 0) {
        throw new DomainError("INVALID_INPUT");
      }

      const scale = actualQuantity / Number(batch.recipeYieldQuantity);
      const requirements = batch.recipeLines
        .filter((line) => !line.isOptional)
        .map((line) =>
          scaleRequirement(
            {
              itemId: line.itemId,
              itemName: line.itemName,
              itemType: line.itemType,
              unit: {
                code: line.unitCode,
                kind: line.unitKind as "MASS" | "VOLUME" | "COUNT" | "LENGTH",
                factorToBase: line.unitFactorToBase,
              },
              stockUnit: {
                code: line.itemStockUnitCode,
                kind: line.itemStockUnitKind as
                  | "MASS"
                  | "VOLUME"
                  | "COUNT"
                  | "LENGTH",
                factorToBase: line.itemStockUnitFactorToBase,
              },
              unitId: line.itemStockUnitId,
              quantity: line.quantity,
              lossPct: line.lossPct,
            },
            scale,
          ),
        );

      const available = await deps.productionRepository.listAvailableLots(
        actor.organizationId,
        batch.siteId,
        [...new Set(requirements.map((requirement) => requirement.itemId))],
      );
      const {allocations, shortages} = allocateFefo(requirements, available);

      if (shortages.length > 0) {
        throw new DomainError(
          "INSUFFICIENT_STOCK",
          shortages
            .map((shortage) => `${shortage.itemName}: ${shortage.available}/${shortage.required}`)
            .join(", "),
        );
      }

      // Merge multiple recipe lines consuming the same lot.
      const merged = new Map<
        string,
        {
          lotId: string;
          itemId: string;
          itemName: string;
          itemType: string;
          quantity: number;
          unitId: string;
          unitCode: string;
          unitKind: string;
          unitFactorToBase: string;
          unitCost: string;
          lotNumber: string;
        }
      >();

      for (const allocation of allocations) {
        const lot = available.find((candidate) => candidate.id === allocation.lotId);
        if (!lot) continue;

        const key = allocation.lotId;
        const existing = merged.get(key);
        if (existing) {
          existing.quantity += Number(allocation.quantity.toString());
        } else {
          merged.set(key, {
            lotId: allocation.lotId,
            itemId: allocation.itemId,
            itemName: allocation.itemName,
            itemType: allocation.itemType,
            quantity: Number(allocation.quantity.toString()),
            unitId: allocation.unitId,
            unitCode: lot.unitCode,
            unitKind: lot.unitKind,
            unitFactorToBase: lot.unitFactorToBase,
            unitCost: allocation.unitCost.toString(),
            lotNumber: allocation.lotNumber,
          });
        }
      }

      const producedOn = input.producedOn ?? new Date();
      const date = new Date(producedOn);
      date.setUTCHours(0, 0, 0, 0);

      const [settings, rates, tariffs] = await Promise.all([
        deps.costingRepository.getSettings(actor.organizationId),
        deps.costingRepository.resolveLabourRates(actor.organizationId, date),
        deps.costingRepository.resolveEnergyTariffs(actor.organizationId, date),
      ]);

      const defaultRate =
        rates.find((rate) => rate.id === settings.defaultLabourRateId) ??
        rates.find((rate) => rate.siteId === null) ??
        rates[0] ??
        null;

      const operations = batch.recipeOperations.flatMap((operation) => {
        const rate =
          rates.find((candidate) => candidate.id === operation.labourRateId) ??
          defaultRate;
        const tariffSiteId = operation.equipmentSiteId ?? batch.siteId;
        const tariff =
          tariffs.find((candidate) => candidate.siteId === tariffSiteId) ??
          tariffs[0] ??
          null;

        const labour = {
          kind: "LABOUR" as const,
          recipeOperationId: operation.id,
          label: operation.name,
          durationMinutes: operation.durationMinutes,
          activeMinutes: operation.activeMinutes,
          labourHourlyCost: rate?.hourlyCost ?? null,
          equipmentPowerKw: null,
          energyPricePerKwh: null,
        };

        if (!operation.equipmentId) return [labour];

        return [
          labour,
          {
            kind: "ENERGY" as const,
            recipeOperationId: operation.id,
            label: operation.name,
            durationMinutes: operation.durationMinutes,
            activeMinutes: operation.activeMinutes,
            labourHourlyCost: null,
            equipmentPowerKw: operation.equipmentPowerKw,
            energyPricePerKwh: tariff?.pricePerKwh ?? null,
          },
        ];
      });

      const outputQuantity = roundQuantity(
        convertQuantity(
          input.actualQuantity,
          {
            code: batch.unitCode,
            kind: batch.unitKind as "MASS" | "VOLUME" | "COUNT" | "LENGTH",
            factorToBase: batch.unitFactorToBase,
          },
          {
            code: batch.outputStockUnitCode,
            kind: batch.outputStockUnitKind as
              | "MASS"
              | "VOLUME"
              | "COUNT"
              | "LENGTH",
            factorToBase: batch.outputStockUnitFactorToBase,
          },
        ),
      );

      const result = computeCosting({
        yieldQuantity: outputQuantity.toString(),
        overheadPct: settings.overheadPct,
        salePrice: batch.outputSalePrice,
        currency: settings.currency,
        lines: [...merged.values()].map((allocation) => ({
          kind:
            allocation.itemType === "PACKAGING"
              ? ("PACKAGING" as const)
              : ("MATERIAL" as const),
          itemId: allocation.itemId,
          label: `${allocation.itemName} · ${allocation.lotNumber}`,
          quantity: allocation.quantity.toString(),
          unit: {
            code: allocation.unitCode,
            kind: allocation.unitKind as
              | "MASS"
              | "VOLUME"
              | "COUNT"
              | "LENGTH",
            factorToBase: allocation.unitFactorToBase,
          },
          stockUnit: {
            code: allocation.unitCode,
            kind: allocation.unitKind as
              | "MASS"
              | "VOLUME"
              | "COUNT"
              | "LENGTH",
            factorToBase: allocation.unitFactorToBase,
          },
          stockUnitId: allocation.unitId,
          lossPct: "0",
          isOptional: false,
          unitCostPerStockUnit: allocation.unitCost,
          lotId: allocation.lotId,
        })),
        operations,
      });

      if (result.warnings.length > 0) {
        throw new DomainError(
          "MISSING_PRICE",
          result.warnings
            .map((warning) => `${warning.code}: ${warning.subject}`)
            .join(", "),
        );
      }

      const cost: CostSnapshotInput = {
        currency: result.currency,
        materialCost: result.materialCost.toString(),
        packagingCost: result.packagingCost.toString(),
        labourCost: result.labourCost.toString(),
        energyCost: result.energyCost.toString(),
        overheadCost: result.overheadCost.toString(),
        totalCost: result.totalCost.toString(),
        yieldQuantity: outputQuantity.toString(),
        yieldUnitId: batch.outputStockUnitId,
        costPerUnit: result.costPerUnit.toString(),
        salePrice: batch.outputSalePrice,
        marginPct: result.marginPct?.toString() ?? null,
        inputHash: null,
        lines: result.lines.map((line) => ({
          kind: line.kind,
          itemId: line.itemId,
          lotId: line.lotId,
          recipeOperationId: line.recipeOperationId,
          label: line.label,
          quantity: line.quantity?.toString() ?? null,
          unitId: line.unitId,
          unitCost: line.unitCost?.toString() ?? null,
          amount: line.amount.toString(),
          position: line.position,
        })),
      };

      const expiresOn = batch.outputShelfLifeDays
        ? new Date(
            date.getTime() + batch.outputShelfLifeDays * 24 * 60 * 60 * 1000,
          )
        : null;

      const plan: BatchCompletionInput = {
        actualQuantity: input.actualQuantity,
        producedOn: date,
        inputs: [...merged.values()].map((allocation) => ({
          lotId: allocation.lotId,
          itemId: allocation.itemId,
          quantity: allocation.quantity.toFixed(4),
          unitId: allocation.unitId,
          unitCost: allocation.unitCost,
          theoreticalQuantity: allocation.quantity.toFixed(4),
        })),
        output: {
          itemId: batch.outputItemId,
          quantity: outputQuantity.toString(),
          unitId: batch.outputStockUnitId,
          unitCost: result.costPerUnit.toString(),
          expiresOn,
        },
        cost,
      };

      await deps.productionRepository.complete(
        actor.organizationId,
        id,
        plan,
        actor.userId,
      );
    },

    async getWaste(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "waste:read");

      return deps.productionRepository.listWaste(actor.organizationId);
    },

    async getWasteOptions(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "waste:read");

      return deps.productionRepository.wasteOptions(actor.organizationId);
    },

    async recordWaste(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "waste:write");

      if (Number(input.quantity) <= 0) {
        throw new DomainError("INVALID_INPUT");
      }

      await deps.productionRepository.recordWaste(
        actor.organizationId,
        input,
        actor.userId,
      );
    },

    async archiveWaste(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "waste:write");

      await deps.productionRepository.archiveWaste(
        actor.organizationId,
        id,
      );
    },

    async getTrace(actorInput, lotId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "stock:read");

      return deps.productionRepository.trace(actor.organizationId, lotId);
    },
  };
}
