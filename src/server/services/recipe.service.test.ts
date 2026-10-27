import {createRecipeService} from "@/server/services/recipe.service";
import type {OrganizationActor} from "@/server/auth/types";
import type {OrgRole} from "@/lib/permissions";
import type {RecipeRepository} from "@/server/repositories/recipe.repository";
import type {CostingRepository} from "@/server/repositories/costing.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {EquipmentRepository} from "@/server/repositories/equipment.repository";
import type {RateRepository} from "@/server/repositories/rate.repository";
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

function service(repository = recipeRepository()) {
  return {
    repository,
    service: createRecipeService({
      recipeRepository: repository,
      costingRepository: costingRepository(),
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
});
