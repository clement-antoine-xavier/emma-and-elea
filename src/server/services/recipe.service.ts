
import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor, OrganizationActor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import {computeCosting} from "@/server/domain/costing";
import type {ConvertibleUnit} from "@/server/domain/units";
import type {
  RecipeCostRecord,
  RecipeDetailRecord,
  RecipeListRecord,
  RecipeOptions,
  RecipeVersionDetailRecord,
} from "@/lib/dto";
import {isUniqueConstraintError} from "@/server/repositories/errors";
import type {
  CostSnapshotInput,
  RecipeIdentityInput,
  RecipeRepository,
  RecipeVersionInput,
} from "@/server/repositories/recipe.repository";
import type {CostingRepository} from "@/server/repositories/costing.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {EquipmentRepository} from "@/server/repositories/equipment.repository";
import type {RateRepository} from "@/server/repositories/rate.repository";

export type RecipeView = {
  recipes: RecipeListRecord[];
  canWrite: boolean;
};

export type RecipeDetailView = {
  recipe: RecipeDetailRecord;
  canWrite: boolean;
  canPublish: boolean;
  canReadCost: boolean;
};

export type RecipeVersionView = {
  version: RecipeVersionDetailRecord;
  canWrite: boolean;
  canPublish: boolean;
  canReadCost: boolean;
};

export type RecipeLineValues = {
  itemId: string;
  quantity: string;
  unitId: string;
  lossPct: string;
  isOptional: boolean;
  note: string | null;
};

export type RecipeOperationValues = {
  name: string;
  description: string | null;
  durationMinutes: number;
  activeMinutes: number | null;
  equipmentId: string | null;
  labourRateId: string | null;
};

export interface RecipeService {
  getRecipes(actor: Actor | null): Promise<RecipeView>;
  getRecipe(actor: Actor | null, id: string): Promise<RecipeDetailView | null>;
  getVersion(
    actor: Actor | null,
    versionId: string,
  ): Promise<RecipeVersionView | null>;
  getOptions(actor: Actor | null): Promise<RecipeOptions>;
  createRecipe(
    actor: Actor | null,
    input: RecipeIdentityInput,
  ): Promise<{recipeId: string; versionId: string}>;
  createVersion(
    actor: Actor | null,
    recipeId: string,
    sourceVersionId: string | null,
  ): Promise<{versionId: string}>;
  updateVersion(
    actor: Actor | null,
    versionId: string,
    input: RecipeVersionInput,
  ): Promise<void>;
  addLine(
    actor: Actor | null,
    versionId: string,
    input: RecipeLineValues,
  ): Promise<void>;
  removeLine(
    actor: Actor | null,
    versionId: string,
    lineId: string,
  ): Promise<void>;
  addOperation(
    actor: Actor | null,
    versionId: string,
    input: RecipeOperationValues,
  ): Promise<void>;
  removeOperation(
    actor: Actor | null,
    versionId: string,
    operationId: string,
  ): Promise<void>;
  publishVersion(actor: Actor | null, versionId: string): Promise<void>;
  archiveRecipe(actor: Actor | null, id: string): Promise<void>;
}

function unitOf(unit: {
  code: string;
  kind: string;
  factorToBase: string;
}): ConvertibleUnit {
  return {
    code: unit.code,
    kind: unit.kind as ConvertibleUnit["kind"],
    factorToBase: unit.factorToBase,
  };
}

function costView(
  result: ReturnType<typeof computeCosting>,
  version: RecipeVersionDetailRecord,
  computedAt: Date | null,
): RecipeCostRecord {
  const stockUnitByLineItem = new Map(
    version.lines.map((line) => [line.itemId, line.itemStockUnitCode]),
  );

  return {
    materialCost: result.materialCost.toString(),
    packagingCost: result.packagingCost.toString(),
    labourCost: result.labourCost.toString(),
    energyCost: result.energyCost.toString(),
    overheadCost: result.overheadCost.toString(),
    totalCost: result.totalCost.toString(),
    costPerUnit: result.costPerUnit.toString(),
    marginPct: result.marginPct?.toString() ?? null,
    currency: result.currency,
    computedAt,
    lines: result.lines.map((line) => ({
      id: `${line.kind}-${line.position}`,
      kind: line.kind,
      label: line.label,
      quantity: line.quantity?.toString() ?? null,
      unitCode:
        line.kind === "MATERIAL" || line.kind === "PACKAGING"
          ? (stockUnitByLineItem.get(line.itemId ?? "") ?? null)
          : null,
      unitCost: line.unitCost?.toString() ?? null,
      amount: line.amount.toString(),
    })),
    warnings: result.warnings,
  };
}

export function createRecipeService(deps: {
  recipeRepository: RecipeRepository;
  costingRepository: CostingRepository;
  catalogRepository: CatalogRepository;
  equipmentRepository: EquipmentRepository;
  rateRepository: RateRepository;
}): RecipeService {
  async function options(organizationId: string): Promise<RecipeOptions> {
    const [items, units, equipment, rates] = await Promise.all([
      deps.catalogRepository.listItemOptions(organizationId),
      deps.catalogRepository.listUnits(),
      deps.equipmentRepository.list(organizationId),
      deps.rateRepository.listLabourRates(organizationId),
    ]);

    return {
      outputItems: items.filter(
        (item) =>
          item.type === "FINISHED_PRODUCT" || item.type === "SEMI_FINISHED",
      ),
      lineItems: items,
      units,
      equipment: equipment
        .filter((row) => !row.archivedAt)
        .map((row) => ({
          id: row.id,
          name: row.name,
          siteId: row.siteId,
          siteName: row.siteName,
          powerKw: row.powerKw,
        })),
      labourRates: rates
        .filter((rate) => !rate.archivedAt)
        .map((rate) => ({
          id: rate.id,
          label: rate.label,
          hourlyCost: rate.hourlyCost,
          currency: rate.currency,
          siteId: rate.siteId,
          siteName: rate.siteName,
        })),
    };
  }

  async function computeVersion(
    organizationId: string,
    version: RecipeVersionDetailRecord,
  ) {
    const date = new Date();
    const [settings, defaultSiteId, prices, rates, tariffs] =
      await Promise.all([
        deps.costingRepository.getSettings(organizationId),
        deps.costingRepository.getDefaultSiteId(organizationId),
        deps.costingRepository.resolvePrices(
          organizationId,
          version.lines.map((line) => line.itemId),
          date,
        ),
        deps.costingRepository.resolveLabourRates(organizationId, date),
        deps.costingRepository.resolveEnergyTariffs(organizationId, date),
      ]);

    const defaultRate =
      rates.find((rate) => rate.id === settings.defaultLabourRateId) ??
      rates.find((rate) => rate.siteId === null) ??
      rates[0] ??
      null;

    const lines = version.lines.map((line) => ({
      kind:
        line.itemType === "PACKAGING"
          ? ("PACKAGING" as const)
          : ("MATERIAL" as const),
      itemId: line.itemId,
      label: line.itemName,
      quantity: line.quantity,
      unit: unitOf({
        code: line.unitCode,
        kind: line.unitKind,
        factorToBase: line.unitFactorToBase,
      }),
      stockUnit: unitOf({
        code: line.itemStockUnitCode,
        kind: line.itemStockUnitKind,
        factorToBase: line.itemStockUnitFactorToBase,
      }),
      stockUnitId: line.itemStockUnitId,
      lossPct: line.lossPct,
      isOptional: line.isOptional,
      unitCostPerStockUnit:
        prices[line.itemId]?.unitCostPerStockUnit ?? null,
    }));

    const operations = version.operations.flatMap((operation) => {
      const rate =
        rates.find((candidate) => candidate.id === operation.labourRateId) ??
        defaultRate;
      const tariffSiteId = operation.equipmentSiteId ?? defaultSiteId;
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

    const result = computeCosting({
      yieldQuantity: version.yieldQuantity,
      overheadPct: settings.overheadPct,
      salePrice: version.salePrice,
      currency: settings.currency,
      lines,
      operations,
    });

    return {result, settings};
  }

  async function requireVersion(
    organizationId: string,
    versionId: string,
  ): Promise<RecipeVersionDetailRecord> {
    const version = await deps.recipeRepository.findVersion(
      organizationId,
      versionId,
    );
    if (!version) throw new DomainError("NOT_FOUND");
    return version;
  }

  function assertDraft(version: RecipeVersionDetailRecord): void {
    if (version.status !== "DRAFT") {
      throw new DomainError("INVALID_STATE_TRANSITION");
    }
  }

  function assertCycle(
    version: RecipeVersionDetailRecord,
    graph: {outputItemId: string; lineItemIds: string[]}[],
  ): void {
    const edges = new Map(
      graph.map((edge) => [edge.outputItemId, edge.lineItemIds]),
    );
    const queue = version.lines.map((line) => line.itemId);
    const seen = new Set<string>();

    while (queue.length > 0) {
      const itemId = queue.shift();
      if (!itemId || seen.has(itemId)) continue;
      seen.add(itemId);

      if (itemId === version.outputItemId) {
        throw new DomainError("RECIPE_CYCLE");
      }

      for (const next of edges.get(itemId) ?? []) queue.push(next);
    }
  }

  function canPublish(actor: OrganizationActor): boolean {
    return isGranted(actor, "recipe:publish");
  }

  return {
    async getRecipes(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:read");

      return {
        recipes: await deps.recipeRepository.list(actor.organizationId),
        canWrite: isGranted(actor, "recipe:write"),
      };
    },

    async getRecipe(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:read");

      const recipe = await deps.recipeRepository.findRecipe(
        actor.organizationId,
        id,
      );
      if (!recipe) return null;

      return {
        recipe,
        canWrite: isGranted(actor, "recipe:write"),
        canPublish: canPublish(actor),
        canReadCost: isGranted(actor, "cost:read"),
      };
    },

    async getVersion(actorInput, versionId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:read");

      // The page turns a missing version into notFound(); returning null keeps
      // that contract instead of surfacing a domain error as a 500.
      const version = await deps.recipeRepository.findVersion(
        actor.organizationId,
        versionId,
      );
      if (!version) return null;

      const canReadCost = isGranted(actor, "cost:read");

      if (canReadCost && version.status === "DRAFT") {
        const {result} = await computeVersion(actor.organizationId, version);
        version.cost = costView(result, version, null);
      }

      return {
        version,
        canWrite: isGranted(actor, "recipe:write"),
        canPublish: canPublish(actor),
        canReadCost,
      };
    },

    async getOptions(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:read");

      return options(actor.organizationId);
    },

    async createRecipe(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:write");

      const outputItems = (
        await deps.catalogRepository.listItemOptions(actor.organizationId)
      ).filter(
        (item) =>
          item.type === "FINISHED_PRODUCT" || item.type === "SEMI_FINISHED",
      );
      const outputItem = outputItems.find(
        (item) => item.id === input.outputItemId,
      );
      if (!outputItem) throw new DomainError("INVALID_RECIPE_OUTPUT");

      try {
        return await deps.recipeRepository.createWithVersion(
          actor.organizationId,
          {
            ...input,
            code: input.code.toUpperCase(),
            description: input.description || null,
          },
          outputItem.stockUnitId,
        );
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new DomainError("DUPLICATE_CODE", undefined, {cause: error});
        }
        throw error;
      }
    },

    async createVersion(actorInput, recipeId, sourceVersionId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:write");

      const recipe = await deps.recipeRepository.findRecipeSummary(
        actor.organizationId,
        recipeId,
      );
      if (!recipe) throw new DomainError("NOT_FOUND");

      if (sourceVersionId) {
        const source = await requireVersion(
          actor.organizationId,
          sourceVersionId,
        );
        if (source.recipeId !== recipeId) throw new DomainError("NOT_FOUND");
      }

      return {
        versionId: await deps.recipeRepository.createVersion(
          actor.organizationId,
          recipeId,
          sourceVersionId,
        ),
      };
    },

    async updateVersion(actorInput, versionId, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:write");

      const version = await requireVersion(actor.organizationId, versionId);
      assertDraft(version);

      const unit = await deps.catalogRepository.findUnit(input.yieldUnitId);
      if (!unit || unit.kind !== version.outputStockUnitKind) {
        throw new DomainError("INVALID_UNIT");
      }
      if (Number(input.yieldQuantity) <= 0) {
        throw new DomainError("INVALID_INPUT");
      }

      const updated = await deps.recipeRepository.updateVersion(
        actor.organizationId,
        versionId,
        input,
      );
      if (!updated) throw new DomainError("INVALID_STATE_TRANSITION");
    },

    async addLine(actorInput, versionId, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:write");

      const version = await requireVersion(actor.organizationId, versionId);
      assertDraft(version);

      const item = (
        await deps.catalogRepository.listItemOptions(actor.organizationId)
      ).find((candidate) => candidate.id === input.itemId);
      if (!item) throw new DomainError("NOT_FOUND");

      const [unit, stockUnit] = await Promise.all([
        deps.catalogRepository.findUnit(input.unitId),
        deps.catalogRepository.findUnit(item.stockUnitId),
      ]);
      if (!unit || !stockUnit || unit.kind !== stockUnit.kind) {
        throw new DomainError("INVALID_UNIT");
      }
      if (Number(input.quantity) <= 0) {
        throw new DomainError("INVALID_INPUT");
      }

      await deps.recipeRepository.addLine(actor.organizationId, versionId, {
        itemId: input.itemId,
        quantity: input.quantity,
        unitId: input.unitId,
        lossPct: input.lossPct,
        isOptional: input.isOptional,
        note: input.note,
      });
    },

    async removeLine(actorInput, versionId, lineId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:write");

      await deps.recipeRepository.removeLine(
        actor.organizationId,
        versionId,
        lineId,
      );
    },

    async addOperation(actorInput, versionId, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:write");

      const version = await requireVersion(actor.organizationId, versionId);
      assertDraft(version);

      if (input.durationMinutes <= 0) {
        throw new DomainError("INVALID_INPUT");
      }

      await deps.recipeRepository.addOperation(
        actor.organizationId,
        versionId,
        input,
      );
    },

    async removeOperation(actorInput, versionId, operationId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:write");

      await deps.recipeRepository.removeOperation(
        actor.organizationId,
        versionId,
        operationId,
      );
    },

    async publishVersion(actorInput, versionId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:publish");

      const version = await requireVersion(actor.organizationId, versionId);
      assertDraft(version);
      if (version.lines.length === 0) {
        throw new DomainError("INVALID_INPUT", "A recipe needs at least one line.");
      }

      const yieldUnit = await deps.catalogRepository.findUnit(
        version.yieldUnitId,
      );
      if (!yieldUnit || yieldUnit.kind !== version.outputStockUnitKind) {
        throw new DomainError("INVALID_UNIT");
      }

      assertCycle(
        version,
        await deps.recipeRepository.listGraph(actor.organizationId),
      );

      const {result} = await computeVersion(actor.organizationId, version);

      if (result.warnings.length > 0) {
        throw new DomainError(
          "MISSING_PRICE",
          result.warnings
            .map((warning) => `${warning.code}: ${warning.subject}`)
            .join(", "),
        );
      }

      const snapshot: CostSnapshotInput = {
        currency: result.currency,
        materialCost: result.materialCost.toString(),
        packagingCost: result.packagingCost.toString(),
        labourCost: result.labourCost.toString(),
        energyCost: result.energyCost.toString(),
        overheadCost: result.overheadCost.toString(),
        totalCost: result.totalCost.toString(),
        yieldQuantity: version.yieldQuantity,
        yieldUnitId: version.yieldUnitId,
        costPerUnit: result.costPerUnit.toString(),
        salePrice: version.salePrice,
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

      await deps.recipeRepository.publish(
        actor.organizationId,
        versionId,
        snapshot,
      );
    },

    async archiveRecipe(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "recipe:write");

      const recipe = await deps.recipeRepository.findRecipeSummary(
        actor.organizationId,
        id,
      );
      if (!recipe) throw new DomainError("NOT_FOUND");

      const archived = await deps.recipeRepository.archive(
        actor.organizationId,
        id,
      );
      if (!archived) throw new DomainError("NOT_FOUND");
    },
  };
}
