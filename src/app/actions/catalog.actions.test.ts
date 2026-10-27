import {getActorContext} from "@/server/auth/actor";
import {catalogService} from "@/server/services/container";
import {
  addItemAllergenAction,
  archiveCategoryAction,
  archiveItemAction,
  createCategoryAction,
  createItemAction,
  removeItemAllergenAction,
  updateItemAction,
} from "@/app/actions/catalog.actions";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";

jest.mock("@/server/auth/actor", () => ({getActorContext: jest.fn()}));
jest.mock("@/server/services/container", () => ({
  catalogService: {
    createItem: jest.fn(),
    updateItem: jest.fn(),
    archiveItem: jest.fn(),
    createCategory: jest.fn(),
    archiveCategory: jest.fn(),
    setItemAllergen: jest.fn(),
    removeItemAllergen: jest.fn(),
  },
}));

const getActor = getActorContext as jest.Mock;
const catalog = catalogService as unknown as Record<string, jest.Mock>;

const itemInput = {
  name: "Flour",
  code: "FLOUR-1",
  description: "",
  type: "RAW_MATERIAL",
  categoryId: "",
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

beforeEach(() => {
  jest.clearAllMocks();
  getActor.mockResolvedValue(actorFor());
});

describe("catalog item actions", () => {
  it("rejects a visitor", async () => {
    getActor.mockResolvedValue(null);

    await expect(createItemAction(itemInput)).resolves.toEqual({
      ok: false,
      error: "unauthenticated",
    });
    expect(catalog.createItem).not.toHaveBeenCalled();
  });

  it("rejects invalid input", async () => {
    await expect(
      createItemAction({...itemInput, code: "A"}),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
    expect(catalog.createItem).not.toHaveBeenCalled();
  });

  it("creates an item and returns its id", async () => {
    catalog.createItem.mockResolvedValue({id: "item_1"});

    await expect(createItemAction(itemInput)).resolves.toEqual({
      ok: true,
      itemId: "item_1",
    });
    expect(catalog.createItem).toHaveBeenCalledWith(
      expect.objectContaining({role: "owner"}),
      expect.objectContaining({name: "Flour"}),
    );
  });

  it("validates the item id on update", async () => {
    await expect(
      updateItemAction("", itemInput),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
    expect(catalog.updateItem).not.toHaveBeenCalled();

    catalog.updateItem.mockResolvedValue(true);
    await expect(
      updateItemAction("item_1", itemInput),
    ).resolves.toEqual({ok: true});
  });

  it("maps domain failures", async () => {
    catalog.createItem.mockRejectedValue(new DomainError("DUPLICATE_CODE"));

    await expect(createItemAction(itemInput)).resolves.toEqual({
      ok: false,
      error: "duplicateCode",
    });
  });

  it("archives an item and rejects a blank id", async () => {
    catalog.archiveItem.mockResolvedValue(true);

    await expect(archiveItemAction({id: "item_1"})).resolves.toEqual({
      ok: true,
    });
    await expect(archiveItemAction({id: ""})).resolves.toEqual({
      ok: false,
      error: "invalidInput",
    });
  });
});

describe("catalog category and allergen actions", () => {
  it("creates and archives a category", async () => {
    catalog.createCategory.mockResolvedValue({id: "cat_1"});
    catalog.archiveCategory.mockResolvedValue(true);

    await expect(
      createCategoryAction({name: "Bread", parentId: "", sortOrder: "1"}),
    ).resolves.toEqual({ok: true, categoryId: "cat_1"});
    await expect(archiveCategoryAction({id: "cat_1"})).resolves.toEqual({
      ok: true,
    });
  });

  it("rejects an invalid category", async () => {
    await expect(
      createCategoryAction({name: "B", parentId: "", sortOrder: "1"}),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
  });

  it("adds and removes an allergen", async () => {
    catalog.setItemAllergen.mockResolvedValue(undefined);
    catalog.removeItemAllergen.mockResolvedValue(true);

    await expect(
      addItemAllergenAction({
        itemId: "item_1",
        allergenId: "allergen_gluten",
        presence: "CONTAINS",
        note: "",
      }),
    ).resolves.toEqual({ok: true});
    await expect(
      removeItemAllergenAction({id: "item_allergen_1"}),
    ).resolves.toEqual({ok: true});
  });

  it("rejects an invalid allergen", async () => {
    await expect(
      addItemAllergenAction({
        itemId: "item_1",
        allergenId: "",
        presence: "CONTAINS",
        note: "",
      }),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
  });

  it("maps a not-found category", async () => {
    catalog.archiveCategory.mockRejectedValue(new DomainError("NOT_FOUND"));

    await expect(archiveCategoryAction({id: "cat_gone"})).resolves.toEqual({
      ok: false,
      error: "notFound",
    });
  });
});
