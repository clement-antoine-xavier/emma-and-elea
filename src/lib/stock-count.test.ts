import { Decimal } from "@prisma/client/runtime/client";
import {
  computeVariance,
  countMovements,
  type CountLineInput,
} from "./stock-count";

const baseLine: CountLineInput = {
  lotId: "lot_flour",
  itemId: "item_flour",
  unitId: "unit_kg",
  expectedQuantity: "10",
  countedQuantity: "10",
};

describe("computeVariance", () => {
  it("is negative when less than expected was counted", () => {
    expect(computeVariance("10", "8").toString()).toBe("-2");
  });

  it("is positive when more than expected was counted", () => {
    expect(computeVariance("8", "10").toString()).toBe("2");
  });

  it("is zero when the count matches", () => {
    expect(computeVariance("10", "10").toString()).toBe("0");
  });

  it("keeps four-decimal precision", () => {
    expect(computeVariance("1.2345", "1.2346").toString()).toBe("0.0001");
    expect(computeVariance("0.3333", "0.3334").toString()).toBe("0.0001");
  });

  it("accepts Decimal input", () => {
    expect(
      computeVariance(new Decimal("5.5"), new Decimal("5")).toString(),
    ).toBe("-0.5");
  });
});

describe("countMovements", () => {
  it("returns one signed movement per non-zero line", () => {
    const movements = countMovements("count_1", [
      { ...baseLine, countedQuantity: "8" },
      { ...baseLine, lotId: "lot_sugar", expectedQuantity: "2", countedQuantity: "3" },
    ]);

    expect(movements).toHaveLength(2);
    expect(movements[0].quantity.toString()).toBe("-2");
    expect(movements[1].quantity.toString()).toBe("1");
  });

  it("skips lines whose count matches the ledger", () => {
    const movements = countMovements("count_1", [
      baseLine,
      { ...baseLine, lotId: "lot_sugar" },
    ]);

    expect(movements).toEqual([]);
  });

  it("tags every movement as a stock count reference", () => {
    const [movement] = countMovements("count_1", [
      { ...baseLine, countedQuantity: "9.5" },
    ]);

    expect(movement.type).toBe("COUNT");
    expect(movement.referenceType).toBe("STOCK_COUNT");
    expect(movement.referenceId).toBe("count_1");
    expect(movement.quantity).toBeInstanceOf(Decimal);
    expect(movement.reason).toBe("Stock count");
  });

  it("keeps item-level lines with no lot", () => {
    const [movement] = countMovements("count_1", [
      { ...baseLine, lotId: null, countedQuantity: "7" },
    ]);

    expect(movement.lotId).toBeNull();
    expect(movement.quantity.toString()).toBe("-3");
  });

  it("returns nothing for an empty session", () => {
    expect(countMovements("count_1", [])).toEqual([]);
  });

  it("requires a session id", () => {
    expect(() => countMovements("", [baseLine])).toThrow(/stock count id/);
  });
});
