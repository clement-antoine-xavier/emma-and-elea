import {simulateCosting, type CostAssumptions} from "./simulation";

const kg = {
  code: "kg",
  kind: "MASS" as const,
  factorToBase: 1,
  isBase: true,
};

function input() {
  return {
    yieldQuantity: "10",
    overheadPct: "0",
    salePrice: "2",
    currency: "EUR",
    lines: [
      {
        kind: "MATERIAL" as const,
        itemId: "item_flour",
        label: "Flour",
        quantity: "1",
        unit: kg,
        stockUnit: kg,
        stockUnitId: "unit_kg",
        lossPct: "0",
        isOptional: false,
        unitCostPerStockUnit: "10",
      },
    ],
    operations: [
      {
        kind: "LABOUR" as const,
        recipeOperationId: "op_1",
        label: "Mixing",
        durationMinutes: 60,
        activeMinutes: 60,
        labourHourlyCost: "12",
        equipmentPowerKw: null,
        energyPricePerKwh: null,
      },
    ],
  };
}

function assumptions(
  overrides: Partial<CostAssumptions> = {},
): CostAssumptions {
  return {
    materialPct: "0",
    packagingPct: "0",
    labourPct: "0",
    energyPct: "0",
    salePrice: null,
    ...overrides,
  };
}

describe("simulateCosting", () => {
  it("returns the base cost when no assumption changes", () => {
    const result = simulateCosting(input(), assumptions());

    expect(result.base.costPerUnit.toString()).toBe("2.2");
    expect(result.simulated.costPerUnit.toString()).toBe("2.2");
    expect(result.costDeltaPct).toBe("0");
    expect(result.marginDeltaPp).toBe(0);
  });

  it("scales material prices", () => {
    const result = simulateCosting(
      input(),
      assumptions({materialPct: "10"}),
    );

    expect(result.simulated.materialCost.toString()).toBe("11");
    expect(result.simulated.costPerUnit.toString()).toBe("2.3");
    expect(result.costDeltaPct).toBe("4.55");
  });

  it("scales labour rates", () => {
    const result = simulateCosting(
      input(),
      assumptions({labourPct: "50"}),
    );

    expect(result.simulated.labourCost.toString()).toBe("18");
    expect(result.simulated.costPerUnit.toString()).toBe("2.8");
  });

  it("keeps the cost and moves the margin with a sale price override", () => {
    const result = simulateCosting(
      input(),
      assumptions({salePrice: "2.5"}),
    );

    expect(result.simulated.costPerUnit.toString()).toBe("2.2");
    expect(result.base.marginPct?.toString()).toBe("-10");
    expect(result.simulated.marginPct?.toString()).toBe("12");
    expect(result.marginDeltaPp).toBe(22);
  });

  it("supports a negative variation down to zero", () => {
    const result = simulateCosting(
      input(),
      assumptions({materialPct: "-100"}),
    );

    expect(result.simulated.materialCost.toString()).toBe("0");
  });
});
