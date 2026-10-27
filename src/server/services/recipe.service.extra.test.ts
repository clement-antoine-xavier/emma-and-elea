import {createRecipeService} from "@/server/services/recipe.service";
import type {RecipeRepository} from "@/server/repositories/recipe.repository";
import type {CostingRepository} from "@/server/repositories/costing.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {EquipmentRepository} from "@/server/repositories/equipment.repository";
import type {RateRepository} from "@/server/repositories/rate.repository";
import type {
  RecipeDetailRecord,
  RecipeVersionDetailRecord,
} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";
import {unit} from "@/test-utils/units";

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

const recipe: RecipeDetailRecord = {
  id: "recipe_1",
  code: "CROISSANT",
  name: "Croissant",
  description: null,
  outputItemId: "item_croissant",
  outputItemName: "Croissant",
  outputItemType: "FINISHED_PRODUCT",
  currentVersionId: "version_1",
  isArchived: false,
  versions: [
    {
      id: "version_1",
      versionNumber: 1,
      status: "DRAFT",
      yieldQuantity: "10",
      yieldUnitCode: "piece",
      portionCount: null,
      publishedAt: null,
      createdAt: new Date("2026-10-27T00:00:00.000Z"),
      costPerUnit: null,
      currency: null,
      marginPct: null,
    },
  ],
};

function dependencies(overrides: {
  recipeRepository?: Partial<RecipeRepository>;
  costingRepository?: Partial<CostingRepository>;
  catalogRepository?: Partial<CatalogRepository>;
  equipmentRepository?: Partial<EquipmentRepository>;
  rateRepository?: Partial<RateRepository>;
} = {}) {
  const recipeRepository = {
    list: jest.fn().mockResolvedValue([]),
    findRecipe: jest.fn().mockResolvedValue(recipe),
    findRecipeSummary: jest
      .fn()
      .mockResolvedValue({id: "recipe_1", outputItemId: "item_croissant"}),
    createWithVersion: jest
      .fn()
      .mockResolvedValue({recipeId: "recipe_1", versionId: "version_1"}),
    updateIdentity: jest.fn().mockResolvedValue(true),
    archive: jest.fn().mockResolvedValue(true),
    createVersion: jest.fn().mockResolvedValue("version_2"),
    updateVersion: jest.fn().mockResolvedValue(true),
    addLine: jest.fn().mockResolvedValue(undefined),
    removeLine: jest.fn().mockResolvedValue(undefined),
    addOperation: jest.fn().mockResolvedValue(undefined),
    removeOperation: jest.fn().mockResolvedValue(undefined),
    // Return a fresh copy: getVersion attaches a live cost to a draft.
    findVersion: jest.fn().mockImplementation(async () => ({...version})),
    publish: jest.fn().mockResolvedValue(undefined),
    listGraph: jest.fn().mockResolvedValue([]),
    ...overrides.recipeRepository,
  } as unknown as RecipeRepository;
  const costingRepository = {
    getSettings: jest.fn().mockResolvedValue({
      currency: "EUR",
      overheadPct: "0",
      defaultLabourRateId: null,
    }),
    getDefaultSiteId: jest.fn().mockResolvedValue("site_1"),
    resolvePrices: jest.fn().mockResolvedValue({
      item_flour: {unitCostPerStockUnit: "1"},
    }),
    resolveLabourRates: jest.fn().mockResolvedValue([]),
    resolveEnergyTariffs: jest.fn().mockResolvedValue([]),
    ...overrides.costingRepository,
  } as unknown as CostingRepository;
  const catalogRepository = {
    listItemOptions: jest.fn().mockResolvedValue([
      {
        id: "item_flour",
        code: "FLOUR",
        name: "Flour",
        type: "RAW_MATERIAL",
        stockUnitId: "unit_kg",
      },
      {
        id: "item_croissant",
        code: "CROISSANT",
        name: "Croissant",
        type: "FINISHED_PRODUCT",
        stockUnitId: "unit_piece",
      },
      {
        id: "item_dough",
        code: "DOUGH",
        name: "Dough",
        type: "SEMI_FINISHED",
        stockUnitId: "unit_kg",
      },
    ]),
    listUnits: jest.fn().mockResolvedValue([unit("kg"), unit("piece")]),
    findUnit: jest.fn().mockImplementation(async (id: string) =>
      id === "unit_kg" ? unit("kg") : id === "unit_piece" ? unit("piece") : null,
    ),
    ...overrides.catalogRepository,
  } as unknown as CatalogRepository;
  const equipmentRepository = {
    list: jest.fn().mockResolvedValue([
      {
        id: "equipment_1",
        name: "Oven",
        kind: "OVEN",
        siteId: "site_1",
        siteName: "Atelier",
        powerKw: "3",
        archivedAt: null,
      },
      {
        id: "equipment_old",
        name: "Old oven",
        kind: "OVEN",
        siteId: null,
        siteName: null,
        powerKw: null,
        archivedAt: new Date(),
      },
    ]),
    ...overrides.equipmentRepository,
  } as unknown as EquipmentRepository;
  const rateRepository = {
    listLabourRates: jest.fn().mockResolvedValue([
      {
        id: "rate_1",
        label: "Baker",
        hourlyCost: "18",
        currency: "EUR",
        siteId: null,
        siteName: null,
        validFrom: new Date(),
        validTo: null,
        archivedAt: null,
      },
      {
        id: "rate_old",
        label: "Old",
        hourlyCost: "1",
        currency: "EUR",
        siteId: null,
        siteName: null,
        validFrom: new Date(),
        validTo: null,
        archivedAt: new Date(),
      },
    ]),
    ...overrides.rateRepository,
  } as unknown as RateRepository;

  return {
    recipeRepository,
    costingRepository,
    catalogRepository,
    service: createRecipeService({
      recipeRepository,
      costingRepository,
      catalogRepository,
      equipmentRepository,
      rateRepository,
    }),
  };
}

describe("recipe read views", () => {
  it("lists recipes with a write flag and requires recipe:read", async () => {
    const {service, recipeRepository} = dependencies();

    await expect(service.getRecipes(actorFor("stock_manager"))).resolves.toEqual(
      {recipes: [], canWrite: false},
    );
    expect(recipeRepository.list).toHaveBeenCalledWith("org_1");
    await expect(service.getRecipes(null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("returns a recipe view with capability flags", async () => {
    const {service} = dependencies();

    await expect(
      service.getRecipe(actorFor("production_manager"), "recipe_1"),
    ).resolves.toEqual({
      recipe,
      canWrite: true,
      canPublish: true,
      canReadCost: true,
    });

    const staff = await service.getRecipe(actorFor("staff"), "recipe_1");
    expect(staff).toMatchObject({
      canWrite: false,
      canPublish: false,
      canReadCost: false,
    });

    const empty = dependencies({
      recipeRepository: {findRecipe: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      empty.service.getRecipe(actorFor("staff"), "missing"),
    ).resolves.toBeNull();
  });

  it("returns null for an unknown version instead of throwing", async () => {
    const {service} = dependencies({
      recipeRepository: {findVersion: jest.fn().mockResolvedValue(null)},
    });

    await expect(
      service.getVersion(actorFor("production_manager"), "missing"),
    ).resolves.toBeNull();
  });

  it("computes the live cost of a draft for cost readers", async () => {
    const {service, costingRepository} = dependencies();

    const view = await service.getVersion(
      actorFor("production_manager"),
      "version_1",
    );

    expect(view?.canReadCost).toBe(true);
    expect(view?.version.cost).toMatchObject({
      materialCost: "1",
      totalCost: "1",
      costPerUnit: "0.1",
      marginPct: "95",
      currency: "EUR",
      computedAt: null,
    });
    expect(costingRepository.resolvePrices).toHaveBeenCalledWith(
      "org_1",
      ["item_flour"],
      expect.any(Date),
    );
  });

  it("hides cost from roles without cost:read", async () => {
    const {service, costingRepository} = dependencies();

    const view = await service.getVersion(actorFor("staff"), "version_1");

    expect(view).toMatchObject({canReadCost: false, canWrite: false});
    expect(view?.version.cost).toBeNull();
    expect(costingRepository.getSettings).not.toHaveBeenCalled();
  });

  it("keeps a published snapshot untouched", async () => {
    const published = {
      ...version,
      status: "PUBLISHED" as const,
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
        computedAt: new Date("2026-10-27T00:00:00.000Z"),
        lines: [],
        warnings: [],
      },
    };
    const {service, costingRepository} = dependencies({
      recipeRepository: {findVersion: jest.fn().mockResolvedValue(published)},
    });

    const view = await service.getVersion(actorFor("owner"), "version_1");

    expect(view?.version.cost).toBe(published.cost);
    expect(costingRepository.getSettings).not.toHaveBeenCalled();
  });

  it("builds options from output items, active equipment and rates", async () => {
    const {service} = dependencies();

    const options = await service.getOptions(actorFor("staff"));

    expect(options.outputItems.map((item) => item.id)).toEqual([
      "item_croissant",
      "item_dough",
    ]);
    expect(options.lineItems).toHaveLength(3);
    expect(options.equipment.map((row) => row.id)).toEqual(["equipment_1"]);
    expect(options.labourRates.map((row) => row.id)).toEqual(["rate_1"]);
  });
});

describe("recipe identity and versions", () => {
  it("creates a recipe only for a produced output item", async () => {
    const {service, recipeRepository} = dependencies();

    await expect(
      service.createRecipe(actorFor("production_manager"), {
        code: "croissant",
        name: "Croissant",
        description: "",
        outputItemId: "item_croissant",
      }),
    ).resolves.toEqual({recipeId: "recipe_1", versionId: "version_1"});
    expect(recipeRepository.createWithVersion).toHaveBeenCalledWith(
      "org_1",
      {
        code: "CROISSANT",
        name: "Croissant",
        description: null,
        outputItemId: "item_croissant",
      },
      "unit_piece",
    );

    await expect(
      service.createRecipe(actorFor("production_manager"), {
        code: "FLOUR",
        name: "Flour",
        description: "",
        outputItemId: "item_flour",
      }),
    ).rejects.toMatchObject({code: "INVALID_RECIPE_OUTPUT"});
  });

  it("maps a duplicate recipe code", async () => {
    const {service} = dependencies({
      recipeRepository: {
        createWithVersion: jest
          .fn()
          .mockRejectedValue(Object.assign(new Error("dup"), {code: "P2002"})),
      },
    });

    await expect(
      service.createRecipe(actorFor("production_manager"), {
        code: "CROISSANT",
        name: "Croissant",
        description: "",
        outputItemId: "item_croissant",
      }),
    ).rejects.toMatchObject({code: "DUPLICATE_CODE"});
  });

  it("creates a version from an optional source of the same recipe", async () => {
    const {service, recipeRepository} = dependencies();

    await expect(
      service.createVersion(actorFor("production_manager"), "recipe_1", null),
    ).resolves.toEqual({versionId: "version_2"});
    await expect(
      service.createVersion(
        actorFor("production_manager"),
        "recipe_1",
        "version_1",
      ),
    ).resolves.toEqual({versionId: "version_2"});
    expect(recipeRepository.createVersion).toHaveBeenCalledWith(
      "org_1",
      "recipe_1",
      "version_1",
    );

    const missingRecipe = dependencies({
      recipeRepository: {
        findRecipeSummary: jest.fn().mockResolvedValue(null),
      },
    });
    await expect(
      missingRecipe.service.createVersion(
        actorFor("production_manager"),
        "missing",
        null,
      ),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const foreignSource = dependencies({
      recipeRepository: {
        findVersion: jest
          .fn()
          .mockResolvedValue({...version, recipeId: "recipe_other"}),
      },
    });
    await expect(
      foreignSource.service.createVersion(
        actorFor("production_manager"),
        "recipe_1",
        "version_other",
      ),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("updates a draft version with a compatible yield unit", async () => {
    const {service, recipeRepository} = dependencies();
    const input = {
      yieldQuantity: "12",
      yieldUnitId: "unit_piece",
      portionCount: 12,
      prepMinutes: null,
      cookMinutes: null,
      instructions: "Shape.",
      changeNote: null,
    };

    await expect(
      service.updateVersion(actorFor("production_manager"), "version_1", input),
    ).resolves.toBeUndefined();
    expect(recipeRepository.updateVersion).toHaveBeenCalledWith(
      "org_1",
      "version_1",
      input,
    );
  });

  it("rejects a published version, a wrong unit and a zero yield", async () => {
    const published = dependencies({
      recipeRepository: {
        findVersion: jest
          .fn()
          .mockResolvedValue({...version, status: "PUBLISHED"}),
      },
    });
    const input = {
      yieldQuantity: "10",
      yieldUnitId: "unit_piece",
      portionCount: null,
      prepMinutes: null,
      cookMinutes: null,
      instructions: null,
      changeNote: null,
    };
    await expect(
      published.service.updateVersion(
        actorFor("production_manager"),
        "version_1",
        input,
      ),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});

    const wrongUnit = dependencies();
    await expect(
      wrongUnit.service.updateVersion(actorFor("production_manager"), "version_1", {
        ...input,
        yieldUnitId: "unit_kg",
      }),
    ).rejects.toMatchObject({code: "INVALID_UNIT"});

    await expect(
      wrongUnit.service.updateVersion(actorFor("production_manager"), "version_1", {
        ...input,
        yieldQuantity: "0",
      }),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("throws NOT_FOUND when updating or adding to a missing version", async () => {
    const {service} = dependencies({
      recipeRepository: {findVersion: jest.fn().mockResolvedValue(null)},
    });

    await expect(
      service.addLine(actorFor("production_manager"), "missing", {
        itemId: "item_flour",
        quantity: "1",
        unitId: "unit_kg",
        lossPct: "0",
        isOptional: false,
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
    await expect(
      service.addOperation(actorFor("production_manager"), "missing", {
        name: "Mix",
        description: null,
        durationMinutes: 10,
        activeMinutes: null,
        equipmentId: null,
        labourRateId: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });
});

describe("recipe lines and operations", () => {
  it("adds a line with a compatible unit", async () => {
    const {service, recipeRepository} = dependencies();
    const input = {
      itemId: "item_flour",
      quantity: "2",
      unitId: "unit_kg",
      lossPct: "5",
      isOptional: false,
      note: null,
    };

    await expect(
      service.addLine(actorFor("production_manager"), "version_1", input),
    ).resolves.toBeUndefined();
    expect(recipeRepository.addLine).toHaveBeenCalledWith(
      "org_1",
      "version_1",
      input,
    );
  });

  it("rejects a missing item and a different unit kind", async () => {
    const {service} = dependencies();

    await expect(
      service.addLine(actorFor("production_manager"), "version_1", {
        itemId: "missing",
        quantity: "1",
        unitId: "unit_kg",
        lossPct: "0",
        isOptional: false,
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    await expect(
      service.addLine(actorFor("production_manager"), "version_1", {
        itemId: "item_flour",
        quantity: "1",
        unitId: "unit_piece",
        lossPct: "0",
        isOptional: false,
        note: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_UNIT"});
  });

  it("adds and removes operations and lines", async () => {
    const {service, recipeRepository} = dependencies();

    await expect(
      service.addOperation(actorFor("production_manager"), "version_1", {
        name: "Mix",
        description: null,
        durationMinutes: 10,
        activeMinutes: 5,
        equipmentId: null,
        labourRateId: "rate_1",
      }),
    ).resolves.toBeUndefined();
    await expect(
      service.removeOperation(actorFor("production_manager"), "version_1", "op_1"),
    ).resolves.toBeUndefined();
    await expect(
      service.removeLine(actorFor("production_manager"), "version_1", "line_1"),
    ).resolves.toBeUndefined();
    expect(recipeRepository.addOperation).toHaveBeenCalled();
    expect(recipeRepository.removeOperation).toHaveBeenCalledWith(
      "org_1",
      "version_1",
      "op_1",
    );
    expect(recipeRepository.removeLine).toHaveBeenCalledWith(
      "org_1",
      "version_1",
      "line_1",
    );
  });

  it("rejects a non-positive operation duration", async () => {
    const {service} = dependencies();

    await expect(
      service.addOperation(actorFor("production_manager"), "version_1", {
        name: "Mix",
        description: null,
        durationMinutes: 0,
        activeMinutes: null,
        equipmentId: null,
        labourRateId: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });
});

describe("recipe publishing", () => {
  it("publishes a priced draft and stores the snapshot", async () => {
    const {service, recipeRepository} = dependencies();

    await expect(
      service.publishVersion(actorFor("production_manager"), "version_1"),
    ).resolves.toBeUndefined();
    expect(recipeRepository.publish).toHaveBeenCalledWith(
      "org_1",
      "version_1",
      expect.objectContaining({
        currency: "EUR",
        materialCost: "1",
        totalCost: "1",
        costPerUnit: "0.1",
        yieldQuantity: "10",
        yieldUnitId: "unit_piece",
        marginPct: "95",
      }),
    );
  });

  it("requires recipe:publish", async () => {
    const {service} = dependencies();

    await expect(
      service.publishVersion(actorFor("stock_manager"), "version_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("refuses a published version and an empty recipe", async () => {
    const published = dependencies({
      recipeRepository: {
        findVersion: jest
          .fn()
          .mockResolvedValue({...version, status: "PUBLISHED"}),
      },
    });
    await expect(
      published.service.publishVersion(actorFor("production_manager"), "version_1"),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});

    const empty = dependencies({
      recipeRepository: {
        findVersion: jest.fn().mockResolvedValue({...version, lines: []}),
      },
    });
    await expect(
      empty.service.publishVersion(actorFor("production_manager"), "version_1"),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("refuses an incompatible yield unit and a cycle", async () => {
    const conflictingUnit = dependencies({
      catalogRepository: {
        // The version outputs COUNT pieces, but the unit resolves to mass.
        findUnit: jest.fn().mockImplementation(async () =>
          unit("kg"),
        ),
      },
    });
    await expect(
      conflictingUnit.service.publishVersion(
        actorFor("production_manager"),
        "version_1",
      ),
    ).rejects.toMatchObject({code: "INVALID_UNIT"});

    const cycle = dependencies({
      recipeRepository: {
        listGraph: jest.fn().mockResolvedValue([
          {outputItemId: "item_flour", lineItemIds: ["item_croissant"]},
        ]),
      },
    });
    await expect(
      cycle.service.publishVersion(actorFor("production_manager"), "version_1"),
    ).rejects.toMatchObject({code: "RECIPE_CYCLE"});
  });

  it("blocks publishing with missing prices and reports the warning", async () => {
    const {service} = dependencies({
      costingRepository: {
        resolvePrices: jest.fn().mockResolvedValue({}),
      },
    });

    await expect(
      service.publishVersion(actorFor("production_manager"), "version_1"),
    ).rejects.toMatchObject({
      code: "MISSING_PRICE",
      message: expect.stringContaining("MISSING_PRICE"),
    });
  });

  it("archives a recipe and reports missing rows", async () => {
    const {service, recipeRepository} = dependencies();

    await expect(
      service.archiveRecipe(actorFor("production_manager"), "recipe_1"),
    ).resolves.toBeUndefined();
    expect(recipeRepository.archive).toHaveBeenCalledWith("org_1", "recipe_1");

    const missing = dependencies({
      recipeRepository: {findRecipeSummary: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missing.service.archiveRecipe(actorFor("production_manager"), "missing"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const noRow = dependencies({
      recipeRepository: {archive: jest.fn().mockResolvedValue(false)},
    });
    await expect(
      noRow.service.archiveRecipe(actorFor("production_manager"), "recipe_1"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });
});
