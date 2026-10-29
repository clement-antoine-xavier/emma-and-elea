import {createRecipeService} from "@/server/services/recipe.service";
import type {OrganizationActor} from "@/server/auth/types";
import type {OrgRole} from "@/lib/permissions";
import type {RecipeRepository} from "@/server/repositories/recipe.repository";
import type {CostingRepository} from "@/server/repositories/costing.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {EquipmentRepository} from "@/server/repositories/equipment.repository";
import type {RateRepository} from "@/server/repositories/rate.repository";
import type {SkillRepository} from "@/server/repositories/skill.repository";
import type {RecipeVersionDetailRecord} from "@/lib/dto";

function actorFor(role: OrgRole): OrganizationActor {
  return {
    userId: "user_1",
    name: "Actor",
    email: "actor@example.com",
    platformRole: "user",
    isSupport: false,
    sessionId: "session_1",
    activeOrganizationId: "org_1",
    membershipId: "member_1",
    organizationId: "org_1",
    organization: {id: "org_1", name: "Bakery", slug: "bakery"},
    role,
  };
}

const version: RecipeVersionDetailRecord = {
  id: "version_1",
  recipeId: "recipe_1",
  recipeCode: "CROISSANT",
  recipeName: "Croissant",
  versionNumber: 1,
  status: "DRAFT",
  yieldQuantity: "10",
  yieldUnitId: "unit_piece",
  yieldUnitCode: "piece",
  portionCount: null,
  prepMinutes: null,
  cookMinutes: null,
  instructions: null,
  changeNote: null,
  publishedAt: null,
  outputItemId: "item_croissant",
  outputItemName: "Croissant",
  outputItemType: "FINISHED_PRODUCT",
  outputStockUnitId: "unit_piece",
  outputStockUnitCode: "piece",
  outputStockUnitKind: "COUNT",
  salePrice: "2",
  currency: "EUR",
  lines: [
    {
      id: "line_1",
      itemId: "item_flour",
      itemCode: "FLOUR",
      itemName: "Flour",
      itemType: "RAW_MATERIAL",
      quantity: "1",
      unitId: "unit_kg",
      unitCode: "kg",
      unitKind: "MASS",
      unitFactorToBase: "1",
      itemStockUnitId: "unit_kg",
      itemStockUnitCode: "kg",
      itemStockUnitKind: "MASS",
      itemStockUnitFactorToBase: "1",
      lossPct: "0",
      isOptional: false,
      position: 1,
      note: null,
    },
  ],
  operations: [],
  cost: null,
};

function recipeRepository(
  overrides: Partial<RecipeRepository> = {},
): RecipeRepository {
  return {
    list: jest.fn().mockResolvedValue([]),
    findRecipe: jest.fn().mockResolvedValue(null),
    findRecipeSummary: jest.fn().mockResolvedValue({
      id: "recipe_1",
      outputItemId: "item_croissant",
    }),
    createWithVersion: jest.fn(),
    updateIdentity: jest.fn(),
    archive: jest.fn(),
    createVersion: jest.fn(),
    updateVersion: jest.fn(),
    addLine: jest.fn(),
    removeLine: jest.fn(),
    addOperation: jest.fn(),
    removeOperation: jest.fn(),
    findVersion: jest.fn().mockResolvedValue(version),
    publish: jest.fn().mockResolvedValue(undefined),
    addCostSnapshot: jest.fn().mockResolvedValue(undefined),
    listPublishedVersionIds: jest.fn().mockResolvedValue([]),
    listGraph: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function costingRepository(): CostingRepository {
  return {
    getSettings: jest.fn().mockResolvedValue({
      currency: "EUR",
      overheadPct: "10",
      defaultLabourRateId: null,
    }),
    getDefaultSiteId: jest.fn().mockResolvedValue("site_1"),
    resolvePrices: jest.fn().mockResolvedValue({}),
    resolveLabourRates: jest.fn().mockResolvedValue([]),
    resolveEnergyTariffs: jest.fn().mockResolvedValue([]),
  };
}

function service(
  repository = recipeRepository(),
  costing = costingRepository(),
) {
  return {
    repository,
    service: createRecipeService({
      recipeRepository: repository,
      costingRepository: costing,
      catalogRepository: {
        findUnit: jest.fn().mockResolvedValue({
          id: "unit_piece",
          code: "piece",
          labelEn: "piece",
          labelFr: "pièce",
          kind: "COUNT",
          isBase: true,
        }),
        listItemOptions: jest.fn().mockResolvedValue([]),
      } as unknown as CatalogRepository,
      equipmentRepository: {} as EquipmentRepository,
      rateRepository: {} as RateRepository,
      skillRepository: {
        list: jest.fn().mockResolvedValue([]),
      } as unknown as SkillRepository,
    }),
  };
}

describe("recipe service", () => {
  it("refuses to publish with a missing price", async () => {
    const deps = service();

    await expect(
      deps.service.publishVersion(actorFor("owner"), "version_1"),
    ).rejects.toMatchObject({code: "MISSING_PRICE"});
    expect(deps.repository.publish).not.toHaveBeenCalled();
  });

  it("requires the publish permission", async () => {
    const deps = service();

    await expect(
      deps.service.publishVersion(actorFor("staff"), "version_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("marks a published snapshot stale when the stored hash is outdated", async () => {
    const published = publishedVersion("outdated-hash");
    const deps = service(
      recipeRepository({
        findVersion: jest.fn().mockResolvedValue(published),
      }),
    );

    const view = await deps.service.getVersion(actorFor("owner"), "version_1");

    expect(view?.version.cost?.isStale).toBe(true);
    // Cost 0.10 against a sale price of 2.00 gives a 95 % margin.
    expect(view?.version.cost?.marginPct).toBe("95");
  });

  it("requires cost:read to refresh a snapshot", async () => {
    const deps = service(
      recipeRepository({
        findVersion: jest.fn().mockResolvedValue(publishedVersion(null)),
      }),
    );

    await expect(
      deps.service.refreshCost(actorFor("sales"), "version_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("refreshes a published snapshot with a new hash", async () => {
    const repo = recipeRepository({
      findVersion: jest.fn().mockResolvedValue(publishedVersion("outdated")),
    });
    const costing = costingRepository();
    costing.resolvePrices = jest.fn().mockResolvedValue({
      item_flour: {unitCostPerStockUnit: "2", source: "SUPPLIER"},
    });
    const deps = service(repo, costing);

    await deps.service.refreshCost(actorFor("owner"), "version_1");

    expect(repo.addCostSnapshot).toHaveBeenCalledTimes(1);
    const [organizationId, versionId, snapshot, createdById] = (
      repo.addCostSnapshot as jest.Mock
    ).mock.calls[0];
    expect(organizationId).toBe("org_1");
    expect(versionId).toBe("version_1");
    expect(snapshot.inputHash).toEqual(expect.any(String));
    expect(createdById).toBe("user_1");
  });

  it("skips bulk refreshes when a price is missing", async () => {
    const repo = recipeRepository({
      findVersion: jest.fn().mockResolvedValue(publishedVersion("outdated")),
      listPublishedVersionIds: jest
        .fn()
        .mockResolvedValue(["version_1", "version_2"]),
    });
    const deps = service(repo);

    await expect(deps.service.refreshAllCosts(actorFor("owner"))).resolves.toEqual(
      {refreshed: 0, skipped: 2},
    );
    expect(repo.addCostSnapshot).not.toHaveBeenCalled();
  });
});

function publishedVersion(inputHash: string | null): RecipeVersionDetailRecord {
  return {
    ...version,
    status: "PUBLISHED",
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    cost: {
      materialCost: "1",
      packagingCost: "0",
      labourCost: "0",
      energyCost: "0",
      overheadCost: "0",
      totalCost: "1",
      costPerUnit: "0.1",
      marginPct: "95",
      currency: "EUR",
      computedAt: new Date("2026-01-01T00:00:00.000Z"),
      isStale: false,
      inputHash,
      lines: [],
      warnings: [],
    },
  };
}
