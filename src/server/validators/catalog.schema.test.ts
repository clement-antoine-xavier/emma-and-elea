import {
  categoryIdSchema,
  categoryInputSchema,
  itemAllergenIdSchema,
  itemAllergenSchema,
  itemIdSchema,
  itemInputSchema,
} from "@/server/validators/catalog.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const t = (key: string) => key;
const item = itemInputSchema(t);
const category = categoryInputSchema(t);
const allergen = itemAllergenSchema(t);

function validItem(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

describe("itemInputSchema", () => {
  it("accepts a minimal purchasable raw material", () => {
    expect(expectValid(item, validItem()).code).toBe("FLOUR-1");
  });

  it("accepts a fully priced sellable finished product", () => {
    expectValid(
      item,
      validItem({
        type: "FINISHED_PRODUCT",
        saleUnitId: "unit_piece",
        salePrice: "3.50",
        shelfLifeDays: "5",
        minStockQuantity: "10",
        parLevelQuantity: "40.5",
        defaultChannel: "BOTH",
        isPurchasable: false,
        isProduced: true,
        isSellable: true,
      }),
    );
  });

  it("trims text fields", () => {
    expect(expectValid(item, validItem({name: "  Flour  "})).name).toBe(
      "Flour",
    );
  });

  it.each([
    ["name", {name: "A"}, "nameRequired"],
    ["name", {name: "x".repeat(121)}, "nameTooLong"],
    ["code", {code: "A"}, "codeInvalid"],
    ["code", {code: "A_"}, "codeInvalid"],
    ["code", {code: "A".repeat(33)}, "codeInvalid"],
    ["type", {type: "OTHER"}, "typeInvalid"],
    ["stockUnitId", {stockUnitId: ""}, "stockUnitRequired"],
    ["salePrice", {salePrice: "-1"}, "salePriceInvalid"],
    ["salePrice", {salePrice: "1.23456"}, "salePriceInvalid"],
    ["salePrice", {salePrice: "100001"}, "salePriceInvalid"],
    ["vatRate", {vatRate: ""}, "vatInvalid"],
    ["vatRate", {vatRate: "101"}, "vatInvalid"],
    ["vatRate", {vatRate: "5.555"}, "vatInvalid"],
    ["shelfLifeDays", {shelfLifeDays: "3651"}, "shelfLifeInvalid"],
    ["shelfLifeDays", {shelfLifeDays: "1.5"}, "shelfLifeInvalid"],
    ["minStockQuantity", {minStockQuantity: "-1"}, "quantityInvalid"],
    ["parLevelQuantity", {parLevelQuantity: "abc"}, "quantityInvalid"],
    ["defaultChannel", {defaultChannel: "ONLINE"}, "channelInvalid"],
    ["description", {description: "x".repeat(501)}, "descriptionTooLong"],
  ])("rejects an invalid %s", (_field, overrides, message) => {
    expectInvalid(item, validItem(overrides), message);
  });

  it("requires the boolean flags", () => {
    const withoutFlag: Record<string, unknown> = {...validItem()};
    delete withoutFlag.isSellable;
    expectInvalid(item, withoutFlag);
  });

  it("accepts zero for optional numeric fields", () => {
    expectValid(
      item,
      validItem({
        salePrice: "0",
        shelfLifeDays: "0",
        minStockQuantity: "0",
        parLevelQuantity: "0",
      }),
    );
  });
});

describe("categoryInputSchema", () => {
  it("accepts an empty parent and a zero sort order", () => {
    expectValid(category, {name: "Bread", parentId: "", sortOrder: "0"});
  });

  it.each([
    [{name: "B", parentId: "", sortOrder: "0"}, "categoryNameRequired"],
    [
      {name: "x".repeat(61), parentId: "", sortOrder: "0"},
      "categoryNameTooLong",
    ],
    [{name: "Bread", parentId: "", sortOrder: ""}, "sortOrderInvalid"],
    [{name: "Bread", parentId: "", sortOrder: "-1"}, "sortOrderInvalid"],
    [{name: "Bread", parentId: "", sortOrder: "10000"}, "sortOrderInvalid"],
    [{name: "Bread", parentId: "", sortOrder: "1.5"}, "sortOrderInvalid"],
  ])("rejects %p", (input, message) => {
    expectInvalid(category, input, message);
  });
});

describe("itemAllergenSchema", () => {
  const valid = {
    itemId: "item_1",
    allergenId: "allergen_gluten",
    presence: "CONTAINS",
    note: "",
  };

  it("accepts each presence value", () => {
    expectValid(allergen, valid);
    expectValid(allergen, {...valid, presence: "MAY_CONTAIN"});
  });

  it("requires the allergen and a known presence", () => {
    expectInvalid(allergen, {...valid, allergenId: ""}, "allergenInvalid");
    expectInvalid(allergen, {...valid, presence: "TRACE"}, "presenceInvalid");
    expectInvalid(allergen, {...valid, note: "x".repeat(201)}, "noteTooLong");
  });
});

describe("id schemas", () => {
  it("reject blank ids", () => {
    expectInvalid(itemIdSchema, {id: " "});
    expectInvalid(categoryIdSchema, {id: ""});
    expectInvalid(itemAllergenIdSchema, {id: ""});
  });
});
