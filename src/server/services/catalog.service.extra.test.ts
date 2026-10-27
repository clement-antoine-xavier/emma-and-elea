import {createCatalogService} from "@/server/services/catalog.service";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {CategoryRecord, ItemDetailRecord} from "@/lib/dto";
import type {ItemInputValues} from "@/server/validators/catalog.schema";
import {actorFor} from "@/test-utils/actor";
import {unit} from "@/test-utils/units";

const category: CategoryRecord = {
  id: "cat_bread",
  name: "Bread",
  parentId: null,
  parentName: null,
  sortOrder: 1,
  itemCount: 0,
  childCount: 0,
  isArchived: false,
};

const itemDetail: ItemDetailRecord = {
  id: "item_1",
  code: "FLOUR",
  name: "Flour",
  type: "RAW_MATERIAL",
  categoryId: "cat_bread",
  categoryName: "Bread",
  stockUnitCode: "kg",
  saleUnitCode: null,
  salePrice: null,
  vatRate: "5.5",
  isPurchasable: true,
  isProduced: false,
  isSellable: false,
  isArchived: false,
  description: null,
  stockUnitId: "unit_kg",
  saleUnitId: null,
  shelfLifeDays: null,
  minStockQuantity: null,
  parLevelQuantity: null,
  defaultChannel: "NONE",
  allergens: [],
  usedInRecipes: [],
  producesRecipes: [],
  supplierCount: 0,
};

const itemInput: ItemInputValues = {
  name: "Flour",
  code: "flour",
  description: "",
  type: "RAW_MATERIAL",
  categoryId: "cat_bread",
  stockUnitId: "unit_kg",
  saleUnitId: "",
  salePrice: "",
  vatRate: "5.5",
  shelfLifeDays: "",
  minStockQuantity: "",
  parLevelQuantity: "",
  defaultChannel: "NONE",
  isPurchasable: true,
  isProduced: false,
  isSellable: false,
};

function dependencies(overrides: Partial<CatalogRepository> = {}) {
  const repository = {
    listUnits: jest.fn().mockResolvedValue([unit("kg"), unit("g")]),
    findUnit: jest.fn().mockImplementation(async (id: string) =>
      id === "unit_kg" ? unit("kg") : id === "unit_g" ? unit("g") : null,
    ),
    listItemOptions: jest.fn().mockResolvedValue([
      {
        id: "item_1",
        code: "FLOUR",
        name: "Flour",
        type: "RAW_MATERIAL",
        stockUnitId: "unit_kg",
      },
    ]),
    listAllergens: jest.fn().mockResolvedValue([
      {
        id: "allergen_gluten",
        code: "GLUTEN",
        labelEn: "Gluten",
        labelFr: "Gluten",
      },
    ]),
    listItems: jest.fn().mockResolvedValue({items: [], total: 0}),
    findItem: jest.fn().mockResolvedValue(itemDetail),
    findItemSummary: jest.fn().mockResolvedValue({id: "item_1"}),
    createItem: jest.fn().mockResolvedValue("item_1"),
    updateItem: jest.fn().mockResolvedValue(true),
    archiveItem: jest.fn().mockResolvedValue(true),
    listCategories: jest.fn().mockResolvedValue([category]),
    findCategory: jest.fn().mockResolvedValue({id: "cat_bread", parentId: null}),
    createCategory: jest.fn().mockResolvedValue("cat_1"),
    archiveCategory: jest.fn().mockResolvedValue(true),
    setItemAllergen: jest.fn().mockResolvedValue(undefined),
    removeItemAllergen: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as CatalogRepository;

  return {repository, service: createCatalogService({catalogRepository: repository})};
}

describe("catalog read views", () => {
  it("normalises list filters and clamps the page", async () => {
    const {service, repository} = dependencies();

    const result = await service.getCatalogView(actorFor("staff"), {
      search: " flour ",
      type: "NOPE",
      categoryId: "cat_bread",
      includeArchived: "true",
      page: "0",
      pageSize: "1000",
    });

    expect(repository.listItems).toHaveBeenCalledWith("org_1", {
      search: "flour",
      type: null,
      categoryId: "cat_bread",
      includeArchived: true,
      skip: 0,
      take: 100,
    });
    expect(result.filters).toEqual({
      search: "flour",
      type: null,
      categoryId: "cat_bread",
      includeArchived: true,
    });
    expect(result.page).toEqual({items: [], total: 0, page: 1, pageSize: 100});
    expect(result.canWrite).toBe(false);
  });

  it("keeps a valid item type filter", async () => {
    const {service, repository} = dependencies();

    await service.getCatalogView(actorFor("staff"), {type: "PACKAGING"});

    expect(repository.listItems).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({type: "PACKAGING"}),
    );
  });

  it("filters archived categories out of the form options", async () => {
    const {service} = dependencies({
      listCategories: jest.fn().mockResolvedValue([
        category,
        {...category, id: "cat_old", isArchived: true},
      ]),
    });

    const options = await service.getItemFormOptions(actorFor("staff"));

    expect(options.categories.map((row) => row.id)).toEqual(["cat_bread"]);
    expect(options.units).toHaveLength(2);
    expect(options.allergens).toHaveLength(1);
  });

  it("returns an item detail or null", async () => {
    const {service} = dependencies();

    await expect(
      service.getItem(actorFor("staff"), "item_1"),
    ).resolves.toEqual(itemDetail);

    const empty = dependencies({findItem: jest.fn().mockResolvedValue(null)});
    await expect(
      empty.service.getItem(actorFor("staff"), "missing"),
    ).resolves.toBeNull();
  });

  it("returns the category view with a write flag", async () => {
    const {service} = dependencies();

    await expect(service.getCategoriesView(actorFor("staff"))).resolves.toEqual(
      {categories: [category], canWrite: false},
    );
    await expect(
      service.getCategoriesView(actorFor("stock_manager")),
    ).resolves.toMatchObject({canWrite: true});
  });

  it("requires catalog:read for every read view", async () => {
    const {service} = dependencies();

    await expect(service.getCatalogView(null, {})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(service.getCategoriesView(null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("catalog item writes", () => {
  it("creates an item from a normalised input", async () => {
    const {service, repository} = dependencies();

    await expect(
      service.createItem(actorFor("stock_manager"), itemInput),
    ).resolves.toEqual({id: "item_1"});

    expect(repository.createItem).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({
        code: "FLOUR",
        categoryId: "cat_bread",
        description: null,
        salePrice: null,
        saleUnitId: null,
        shelfLifeDays: null,
        minStockQuantity: null,
        parLevelQuantity: null,
        // A raw material is never produced, even if the form says so.
        isProduced: false,
      }),
    );
  });

  it("rejects an unknown category or nested parent", async () => {
    const missing = dependencies({
      findCategory: jest.fn().mockResolvedValue(null),
    });
    await expect(
      missing.service.createItem(actorFor("stock_manager"), itemInput),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});

    const nested = dependencies({
      findCategory: jest
        .fn()
        .mockResolvedValue({id: "cat_bread", parentId: "cat_root"}),
    });
    await expect(
      nested.service.createItem(actorFor("stock_manager"), itemInput),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("updates and archives an item, checking existence", async () => {
    const {service, repository} = dependencies();

    await expect(
      service.updateItem(actorFor("stock_manager"), "item_1", itemInput),
    ).resolves.toBeUndefined();
    await expect(
      service.archiveItem(actorFor("stock_manager"), "item_1"),
    ).resolves.toBeUndefined();
    expect(repository.updateItem).toHaveBeenCalledWith(
      "org_1",
      "item_1",
      expect.objectContaining({code: "FLOUR"}),
    );
    expect(repository.archiveItem).toHaveBeenCalledWith("org_1", "item_1");
  });

  it("throws NOT_FOUND when the item or write misses", async () => {
    const missing = dependencies({
      findItemSummary: jest.fn().mockResolvedValue(null),
    });
    await expect(
      missing.service.updateItem(actorFor("stock_manager"), "missing", itemInput),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const noWrite = dependencies({
      updateItem: jest.fn().mockResolvedValue(false),
      archiveItem: jest.fn().mockResolvedValue(false),
    });
    await expect(
      noWrite.service.updateItem(actorFor("stock_manager"), "item_1", itemInput),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
    await expect(
      noWrite.service.archiveItem(actorFor("stock_manager"), "item_1"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });
});

describe("catalog categories", () => {
  it("creates a root or child category with a numeric sort order", async () => {
    const {service, repository} = dependencies();

    await expect(
      service.createCategory(actorFor("stock_manager"), {
        name: "Bread",
        parentId: "",
        sortOrder: "10",
      }),
    ).resolves.toEqual({id: "cat_1"});
    expect(repository.createCategory).toHaveBeenCalledWith("org_1", {
      name: "Bread",
      parentId: null,
      sortOrder: 10,
    });

    await service.createCategory(actorFor("stock_manager"), {
      name: "Baguette",
      parentId: "cat_bread",
      sortOrder: "1",
    });
    expect(repository.createCategory).toHaveBeenLastCalledWith(
      "org_1",
      expect.objectContaining({parentId: "cat_bread"}),
    );
  });

  it("rejects an unknown or nested parent", async () => {
    const {service} = dependencies({
      findCategory: jest.fn().mockResolvedValue({id: "x", parentId: "root"}),
    });

    await expect(
      service.createCategory(actorFor("stock_manager"), {
        name: "Baguette",
        parentId: "x",
        sortOrder: "1",
      }),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("refuses to archive a category with items or children", async () => {
    const withItems = dependencies({
      listCategories: jest.fn().mockResolvedValue([
        {...category, itemCount: 2},
      ]),
    });
    await expect(
      withItems.service.archiveCategory(actorFor("stock_manager"), "cat_bread"),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});

    const withChildren = dependencies({
      listCategories: jest.fn().mockResolvedValue([
        {...category, childCount: 1},
      ]),
    });
    await expect(
      withChildren.service.archiveCategory(
        actorFor("stock_manager"),
        "cat_bread",
      ),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("archives an empty category and reports a missing one", async () => {
    const {service, repository} = dependencies();

    await expect(
      service.archiveCategory(actorFor("stock_manager"), "cat_bread"),
    ).resolves.toBeUndefined();
    expect(repository.archiveCategory).toHaveBeenCalledWith("org_1", "cat_bread");

    const missing = dependencies({
      findCategory: jest.fn().mockResolvedValue(null),
    });
    await expect(
      missing.service.archiveCategory(actorFor("stock_manager"), "missing"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });
});

describe("catalog allergens", () => {
  it("sets an allergen on an existing item", async () => {
    const {service, repository} = dependencies();

    await expect(
      service.setItemAllergen(actorFor("stock_manager"), {
        itemId: "item_1",
        allergenId: "allergen_gluten",
        presence: "MAY_CONTAIN",
        note: "Shared line",
      }),
    ).resolves.toBeUndefined();
    expect(repository.setItemAllergen).toHaveBeenCalledWith("org_1", {
      itemId: "item_1",
      allergenId: "allergen_gluten",
      presence: "MAY_CONTAIN",
      note: "Shared line",
    });
  });

  it("nulls an empty note", async () => {
    const {service, repository} = dependencies();

    await service.setItemAllergen(actorFor("stock_manager"), {
      itemId: "item_1",
      allergenId: "allergen_gluten",
      presence: "CONTAINS",
      note: "",
    });

    expect(repository.setItemAllergen).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({note: null}),
    );
  });

  it("rejects a missing item or allergen", async () => {
    const missingItem = dependencies({
      findItemSummary: jest.fn().mockResolvedValue(null),
    });
    await expect(
      missingItem.service.setItemAllergen(actorFor("stock_manager"), {
        itemId: "missing",
        allergenId: "allergen_gluten",
        presence: "CONTAINS",
        note: "",
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const missingAllergen = dependencies({
      listAllergens: jest.fn().mockResolvedValue([]),
    });
    await expect(
      missingAllergen.service.setItemAllergen(actorFor("stock_manager"), {
        itemId: "item_1",
        allergenId: "missing",
        presence: "CONTAINS",
        note: "",
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("removes an allergen and reports a missing link", async () => {
    const {service} = dependencies();
    await expect(
      service.removeItemAllergen(actorFor("stock_manager"), "item_allergen_1"),
    ).resolves.toBeUndefined();

    const missing = dependencies({
      removeItemAllergen: jest.fn().mockResolvedValue(false),
    });
    await expect(
      missing.service.removeItemAllergen(actorFor("stock_manager"), "missing"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });
});
