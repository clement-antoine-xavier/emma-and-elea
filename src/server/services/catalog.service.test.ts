import {createCatalogService} from "@/server/services/catalog.service";
import type {OrganizationActor} from "@/server/auth/types";
import type {OrgRole} from "@/lib/permissions";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {ItemInputValues} from "@/server/validators/catalog.schema";

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

const kg = {
  id: "unit_kg",
  code: "kg",
  labelEn: "kilogram",
  labelFr: "kilogramme",
  kind: "MASS" as const,
  isBase: true,
};
const g = {
  id: "unit_g",
  code: "g",
  labelEn: "gram",
  labelFr: "gramme",
  kind: "MASS" as const,
  isBase: false,
};
const piece = {
  id: "unit_piece",
  code: "piece",
  labelEn: "piece",
  labelFr: "pièce",
  kind: "COUNT" as const,
  isBase: true,
};

function repository(
  overrides: Partial<CatalogRepository> = {},
): CatalogRepository {
  return {
    listUnits: jest.fn().mockResolvedValue([kg, g, piece]),
    findUnit: jest
      .fn()
      .mockImplementation(async (id: string) =>
        [kg, g, piece].find((unit) => unit.id === id) ?? null,
      ),
    listAllergens: jest.fn().mockResolvedValue([
      {
        id: "allergen_gluten",
        code: "GLUTEN",
        labelEn: "Cereals containing gluten",
        labelFr: "Céréales contenant du gluten",
      },
    ]),
    listItems: jest.fn().mockResolvedValue({items: [], total: 0}),
    findItem: jest.fn().mockResolvedValue(null),
    findItemSummary: jest.fn().mockResolvedValue({id: "item_1"}),
    createItem: jest.fn().mockResolvedValue("item_1"),
    updateItem: jest.fn().mockResolvedValue(true),
    archiveItem: jest.fn().mockResolvedValue(true),
    listCategories: jest.fn().mockResolvedValue([]),
    findCategory: jest.fn().mockResolvedValue(null),
    createCategory: jest.fn().mockResolvedValue("cat_1"),
    archiveCategory: jest.fn().mockResolvedValue(true),
    setItemAllergen: jest.fn().mockResolvedValue(undefined),
    removeItemAllergen: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function input(overrides: Partial<ItemInputValues> = {}): ItemInputValues {
  return {
    name: "Farine T65",
    code: "farine-t65",
    description: "",
    type: "RAW_MATERIAL",
    categoryId: "",
    stockUnitId: kg.id,
    saleUnitId: "",
    salePrice: "",
    vatRate: "5.50",
    shelfLifeDays: "",
    minStockQuantity: "",
    parLevelQuantity: "",
    defaultChannel: "RETAIL",
    isPurchasable: true,
    isProduced: false,
    isSellable: false,
    ...overrides,
  };
}

describe("catalog service", () => {
  it("rejects writes from read-only roles", async () => {
    const repo = repository();
    const service = createCatalogService({catalogRepository: repo});

    await expect(
      service.createItem(actorFor("staff"), input()),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    expect(repo.createItem).not.toHaveBeenCalled();
  });

  it("normalises the code and forces semi-finished items to be produced", async () => {
    const repo = repository();
    const service = createCatalogService({catalogRepository: repo});

    await service.createItem(
      actorFor("owner"),
      input({type: "SEMI_FINISHED", isProduced: false}),
    );

    expect(repo.createItem).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({
        code: "FARINE-T65",
        type: "SEMI_FINISHED",
        isProduced: true,
      }),
    );
  });

  it("rejects a non-base stock unit", async () => {
    const service = createCatalogService({
      catalogRepository: repository(),
    });

    await expect(
      service.createItem(actorFor("owner"), input({stockUnitId: g.id})),
    ).rejects.toMatchObject({code: "INVALID_UNIT"});
  });

  it("rejects a sellable item without a price", async () => {
    const service = createCatalogService({
      catalogRepository: repository(),
    });

    await expect(
      service.createItem(
        actorFor("owner"),
        input({
          type: "FINISHED_PRODUCT",
          stockUnitId: piece.id,
          saleUnitId: piece.id,
          isSellable: true,
        }),
      ),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("maps a duplicate code to a domain conflict", async () => {
    const service = createCatalogService({
      catalogRepository: repository({
        createItem: jest.fn().mockRejectedValue({code: "P2002"}),
      }),
    });

    await expect(
      service.createItem(actorFor("owner"), input()),
    ).rejects.toMatchObject({code: "DUPLICATE_CODE"});
  });

  it("parses list filters and clamps the page window", async () => {
    const repo = repository();
    const service = createCatalogService({catalogRepository: repo});

    const view = await service.getCatalogView(actorFor("owner"), {
      search: " farine ",
      type: "RAW_MATERIAL",
      page: "2",
      pageSize: "10",
    });

    expect(view.filters).toEqual({
      search: "farine",
      type: "RAW_MATERIAL",
      categoryId: null,
      includeArchived: false,
    });
    expect(view.page.page).toBe(2);
    expect(repo.listItems).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({skip: 10, take: 10, search: "farine"}),
    );
  });
});
