import {
  assertItemInvariants,
  deriveProducedFlag,
  type ItemUnit,
} from "@/server/domain/item";

const kg: ItemUnit = {id: "unit_kg", kind: "MASS", isBase: true};
const g: ItemUnit = {id: "unit_g", kind: "MASS", isBase: false};
const piece: ItemUnit = {id: "unit_piece", kind: "COUNT", isBase: true};
const litre: ItemUnit = {id: "unit_l", kind: "VOLUME", isBase: true};

describe("item invariants", () => {
  it("requires a base stock unit", () => {
    expect(() =>
      assertItemInvariants({
        type: "RAW_MATERIAL",
        stockUnit: g,
        saleUnit: null,
        salePrice: null,
        isSellable: false,
      }),
    ).toThrow(expect.objectContaining({code: "INVALID_UNIT"}));
  });

  it("requires the sale unit to match the stock unit kind", () => {
    expect(() =>
      assertItemInvariants({
        type: "FINISHED_PRODUCT",
        stockUnit: piece,
        saleUnit: kg,
        salePrice: "1.50",
        isSellable: true,
      }),
    ).toThrow(expect.objectContaining({code: "INVALID_UNIT"}));
  });

  it("requires a sale unit and a price for sellable items", () => {
    expect(() =>
      assertItemInvariants({
        type: "FINISHED_PRODUCT",
        stockUnit: piece,
        saleUnit: null,
        salePrice: "1.50",
        isSellable: true,
      }),
    ).toThrow(expect.objectContaining({code: "INVALID_INPUT"}));

    expect(() =>
      assertItemInvariants({
        type: "FINISHED_PRODUCT",
        stockUnit: piece,
        saleUnit: piece,
        salePrice: null,
        isSellable: true,
      }),
    ).toThrow(expect.objectContaining({code: "INVALID_INPUT"}));
  });

  it("accepts a priced sellable finished product", () => {
    expect(() =>
      assertItemInvariants({
        type: "FINISHED_PRODUCT",
        stockUnit: piece,
        saleUnit: piece,
        salePrice: "1.50",
        isSellable: true,
      }),
    ).not.toThrow();
  });

  it("accepts a liquid raw material sold by the litre", () => {
    expect(() =>
      assertItemInvariants({
        type: "RAW_MATERIAL",
        stockUnit: litre,
        saleUnit: null,
        salePrice: null,
        isSellable: false,
      }),
    ).not.toThrow();
  });

  it("derives the produced flag from the item type", () => {
    expect(deriveProducedFlag("SEMI_FINISHED", false)).toBe(true);
    expect(deriveProducedFlag("FINISHED_PRODUCT", true)).toBe(true);
    expect(deriveProducedFlag("FINISHED_PRODUCT", false)).toBe(false);
    expect(deriveProducedFlag("RAW_MATERIAL", true)).toBe(false);
    expect(deriveProducedFlag("PACKAGING", true)).toBe(false);
  });
});
