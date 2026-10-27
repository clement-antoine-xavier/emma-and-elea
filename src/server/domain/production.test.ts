import {Decimal} from "@prisma/client/runtime/client";
import {allocateFefo, scaleRequirement, type AvailableLot} from "@/server/domain/production";

const kg = {
  code: "kg",
  kind: "MASS" as const,
  factorToBase: 1,
  isBase: true,
};
const g = {
  code: "g",
  kind: "MASS" as const,
  factorToBase: "0.001",
  isBase: false,
};

const requirement = {
  itemId: "item_flour",
  itemName: "Flour",
  itemType: "RAW_MATERIAL" as const,
  unit: g,
  stockUnit: kg,
  unitId: "unit_kg",
  quantity: "500",
  lossPct: "10",
};

describe("scaleRequirement", () => {
  it("converts to the stock unit, applies loss and scales by actual yield", () => {
    const scaled = scaleRequirement(requirement, "2");
    // 500 g -> 0.5 kg, +10% loss -> 0.55, x2 -> 1.1
    expect(scaled.quantity.toString()).toBe("1.1");
    expect(scaled.unitId).toBe("unit_kg");
  });
});

function lot(
  id: string,
  expiresOn: string | null,
  receivedAt: string,
  quantityRemaining: string,
): AvailableLot {
  return {
    id,
    lotNumber: `LOT-${id}`,
    itemId: "item_flour",
    itemName: "Flour",
    itemType: "RAW_MATERIAL",
    quantityRemaining,
    unitCost: "1.10",
    unitId: "unit_kg",
    unitCode: "kg",
    unitKind: "MASS",
    unitFactorToBase: "1",
    expiresOn: expiresOn ? new Date(expiresOn) : null,
    receivedAt: new Date(receivedAt),
  };
}

describe("allocateFefo", () => {
  it("consumes the earliest expiry first and splits across lots", () => {
    const result = allocateFefo(
      [
        {
          itemId: "item_flour",
          itemName: "Flour",
          itemType: "RAW_MATERIAL",
          unitId: "unit_kg",
          quantity: new Decimal("3"),
        },
      ],
      [
        lot("late", "2027-01-01", "2026-10-01", "10"),
        lot("early", "2026-11-01", "2026-10-05", "2"),
        lot("undated", null, "2026-09-01", "10"),
      ],
    );

    expect(result.shortages).toEqual([]);
    expect(result.allocations.map((allocation) => allocation.lotId)).toEqual([
      "early",
      "late",
    ]);
    expect(result.allocations[0].quantity.toString()).toBe("2");
    expect(result.allocations[1].quantity.toString()).toBe("1");
  });

  it("falls back to undated lots after dated ones", () => {
    const result = allocateFefo(
      [
        {
          itemId: "item_flour",
          itemName: "Flour",
          itemType: "RAW_MATERIAL",
          unitId: "unit_kg",
          quantity: new Decimal("3"),
        },
      ],
      [
        lot("undated", null, "2026-09-01", "10"),
        lot("early", "2026-11-01", "2026-10-05", "2"),
      ],
    );

    expect(result.allocations.map((allocation) => allocation.lotId)).toEqual([
      "early",
      "undated",
    ]);
  });

  it("reports shortages without partial allocations being lost", () => {
    const result = allocateFefo(
      [
        {
          itemId: "item_flour",
          itemName: "Flour",
          itemType: "RAW_MATERIAL",
          unitId: "unit_kg",
          quantity: new Decimal("5"),
        },
      ],
      [lot("only", null, "2026-09-01", "2")],
    );

    expect(result.allocations).toHaveLength(1);
    expect(result.shortages).toEqual([
      {
        itemId: "item_flour",
        itemName: "Flour",
        required: "5",
        available: "2",
      },
    ]);
  });
});
