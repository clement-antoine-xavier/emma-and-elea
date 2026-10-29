import {
  computeCosting,
  costInputHash,
  packPricePerStockUnit,
} from "@/server/domain/costing";

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
const piece = {
  code: "piece",
  kind: "COUNT" as const,
  factorToBase: 1,
  isBase: true,
};

describe("packPricePerStockUnit", () => {
  it("turns a 25 kg pack at 27.50 into 1.10 per kg", () => {
    expect(
      packPricePerStockUnit("27.50", "25", kg, kg).toString(),
    ).toBe("1.1");
  });

  it("handles a pack expressed in grams", () => {
    expect(
      packPricePerStockUnit("10", "500", g, kg).toString(),
    ).toBe("20");
  });
});

describe("computeCosting", () => {
  it("layers material, packaging, labour, energy and overhead", () => {
    const result = computeCosting({
      yieldQuantity: "20",
      overheadPct: "10",
      salePrice: "1.60",
      currency: "EUR",
      lines: [
        {
          kind: "MATERIAL",
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
        {
          kind: "PACKAGING",
          itemId: "item_box",
          label: "Box",
          quantity: "10",
          unit: piece,
          stockUnit: piece,
          stockUnitId: "unit_piece",
          lossPct: "0",
          isOptional: false,
          unitCostPerStockUnit: "0.2",
        },
      ],
      operations: [
        {
          kind: "LABOUR",
          recipeOperationId: "op_1",
          label: "Mixing",
          durationMinutes: 20,
          activeMinutes: 15,
          labourHourlyCost: "20",
          equipmentPowerKw: null,
          energyPricePerKwh: null,
        },
        {
          kind: "ENERGY",
          recipeOperationId: "op_2",
          label: "Baking",
          durationMinutes: 60,
          activeMinutes: 5,
          labourHourlyCost: null,
          equipmentPowerKw: "1",
          energyPricePerKwh: "1",
        },
      ],
    });

    expect(result.materialCost.toString()).toBe("10");
    expect(result.packagingCost.toString()).toBe("2");
    expect(result.labourCost.toString()).toBe("5");
    expect(result.energyCost.toString()).toBe("1");
    expect(result.overheadCost.toString()).toBe("1.8");
    expect(result.totalCost.toString()).toBe("19.8");
    expect(result.costPerUnit.toString()).toBe("0.99");
    expect(result.marginPct?.toString()).toBe("38.13");
    expect(result.lines).toHaveLength(5);
    expect(result.warnings).toEqual([]);
  });

  it("applies loss and skips optional lines", () => {
    const result = computeCosting({
      yieldQuantity: "10",
      overheadPct: "0",
      salePrice: null,
      currency: "EUR",
      lines: [
        {
          kind: "MATERIAL",
          itemId: "item_flour",
          label: "Flour",
          quantity: "1",
          unit: g,
          stockUnit: kg,
          stockUnitId: "unit_kg",
          lossPct: "10",
          isOptional: false,
          unitCostPerStockUnit: "10",
        },
        {
          kind: "MATERIAL",
          itemId: "item_salt",
          label: "Salt",
          quantity: "1",
          unit: kg,
          stockUnit: kg,
          stockUnitId: "unit_kg",
          lossPct: "0",
          isOptional: true,
          unitCostPerStockUnit: "2",
        },
      ],
      operations: [],
    });

    // 0.001 kg * 1.1 * 10 = 0.011
    expect(result.materialCost.toString()).toBe("0.011");
    expect(result.lines).toHaveLength(2); // material + overhead line
    expect(result.marginPct).toBeNull();
  });

  it("warns instead of silently pricing missing references", () => {
    const result = computeCosting({
      yieldQuantity: "1",
      overheadPct: "0",
      salePrice: null,
      currency: "EUR",
      lines: [
        {
          kind: "MATERIAL",
          itemId: "item_flour",
          label: "Flour",
          quantity: "1",
          unit: kg,
          stockUnit: kg,
          stockUnitId: "unit_kg",
          lossPct: "0",
          isOptional: false,
          unitCostPerStockUnit: null,
        },
      ],
      operations: [
        {
          kind: "LABOUR",
          recipeOperationId: "op_1",
          label: "Mixing",
          durationMinutes: 10,
          activeMinutes: null,
          labourHourlyCost: null,
          equipmentPowerKw: null,
          energyPricePerKwh: null,
        },
        {
          kind: "ENERGY",
          recipeOperationId: "op_2",
          label: "Baking",
          durationMinutes: 10,
          activeMinutes: null,
          labourHourlyCost: null,
          equipmentPowerKw: null,
          energyPricePerKwh: null,
        },
      ],
    });

    expect(result.totalCost.toString()).toBe("0");
    expect(result.warnings).toEqual([
      {code: "MISSING_PRICE", subject: "Flour"},
      {code: "MISSING_RATE", subject: "Mixing"},
      {code: "MISSING_TARIFF", subject: "Baking"},
    ]);
  });
});

describe("costInputHash", () => {
  const input = (): Parameters<typeof costInputHash>[0] => ({
    yieldQuantity: "20",
    overheadPct: "10",
    salePrice: "1.60",
    currency: "EUR",
    lines: [
      {
        kind: "MATERIAL",
        itemId: "item_flour",
        label: "Flour",
        quantity: "1",
        unit: kg,
        stockUnit: kg,
        stockUnitId: "unit_kg",
        lossPct: "2",
        isOptional: false,
        unitCostPerStockUnit: "10",
      },
    ],
    operations: [
      {
        kind: "LABOUR",
        recipeOperationId: "op_1",
        label: "Mixing",
        durationMinutes: 10,
        activeMinutes: null,
        labourHourlyCost: "18",
        equipmentPowerKw: null,
        energyPricePerKwh: null,
      },
    ],
  });

  it("is deterministic for the same inputs", () => {
    expect(costInputHash(input())).toBe(costInputHash(input()));
  });

  it("changes when an ingredient price changes", () => {
    const changed = input();
    changed.lines[0].unitCostPerStockUnit = "11";
    expect(costInputHash(changed)).not.toBe(costInputHash(input()));
  });

  it("changes when a labour rate changes", () => {
    const changed = input();
    changed.operations[0].labourHourlyCost = "20";
    expect(costInputHash(changed)).not.toBe(costInputHash(input()));
  });

  it("changes when a loss percentage changes", () => {
    const changed = input();
    changed.lines[0].lossPct = "3";
    expect(costInputHash(changed)).not.toBe(costInputHash(input()));
  });

  it("ignores the sale price, which only moves the margin", () => {
    const changed = input();
    changed.salePrice = "2.50";
    expect(costInputHash(changed)).toBe(costInputHash(input()));
  });

  it("ignores display labels", () => {
    const changed = input();
    changed.lines[0].label = "Flour T65";
    changed.operations[0].label = "Mixing bowl";
    expect(costInputHash(changed)).toBe(costInputHash(input()));
  });
});
