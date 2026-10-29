import {
  categoryProfitability,
  productProfitability,
  sortProfitability,
  type ProfitabilityItem,
  type ProfitabilityMetric,
} from "./profitability";

const item: ProfitabilityItem = {
  itemId: "item_baguette",
  itemCode: "BAG",
  itemName: "Baguette",
  itemType: "FINISHED_PRODUCT",
  categoryName: "Bread",
  recipeId: "recipe_1",
  recipeName: "Baguette",
  salePrice: "5",
  costPerUnit: "2",
  currency: "EUR",
  costComputedAt: new Date("2026-10-27T00:00:00.000Z"),
};

function metric(
  overrides: Partial<ProfitabilityMetric> = {},
): ProfitabilityMetric {
  return {
    produced: "100",
    sold: "80",
    waste: "5",
    revenue: "400",
    wasteCost: "10",
    missingRevenue: false,
    ...overrides,
  };
}

describe("productProfitability", () => {
  it("combines production, sales, waste and cost", () => {
    const record = productProfitability(item, metric());

    expect(record.unsold).toBe("15");
    expect(record.variance).toBe("15");
    expect(record.contribution).toBe("240");
    expect(record.marginPct).toBe("60");
    expect(record.lossRatePct).toBe("5");
    expect(record.unsoldRatePct).toBe("15");
  });

  it("clamps unsold at zero but keeps the raw variance", () => {
    const record = productProfitability(
      item,
      metric({produced: "50", sold: "80"}),
    );

    expect(record.unsold).toBe("0");
    expect(record.variance).toBe("-35");
    expect(record.unsoldRatePct).toBe("0");
  });

  it("leaves rates empty when nothing was produced", () => {
    const record = productProfitability(
      item,
      metric({produced: "0", sold: "0", waste: "0", revenue: "0"}),
    );

    expect(record.lossRatePct).toBeNull();
    expect(record.unsoldRatePct).toBeNull();
    expect(record.contribution).toBeNull();
  });

  it("keeps the contribution empty without a cost", () => {
    const record = productProfitability(
      {...item, costPerUnit: null},
      metric(),
    );

    expect(record.contribution).toBeNull();
    expect(record.marginPct).toBeNull();
  });
});

describe("categoryProfitability", () => {
  it("aggregates products and weights the margin by costed revenue", () => {
    const bread = productProfitability(item, metric());
    const pastry = productProfitability(
      {
        ...item,
        itemId: "item_croissant",
        itemName: "Croissant",
        categoryName: "Pastry",
        salePrice: "3",
        costPerUnit: "1",
      },
      metric({produced: "40", sold: "40", waste: "0", revenue: "120"}),
    );

    const categories = categoryProfitability([bread, pastry]);

    expect(categories.map((row) => row.categoryName)).toEqual([
      "Bread",
      "Pastry",
    ]);
    expect(categories[0]).toMatchObject({
      productCount: 1,
      revenue: "400",
      contribution: "240",
      marginPct: "60",
    });
    expect(categories[1].contribution).toBe("80");
  });
});

describe("sortProfitability", () => {
  it("sorts by contribution and pushes nulls last", () => {
    const first = productProfitability(item, metric());
    const second = productProfitability(
      {...item, itemId: "item_2", itemName: "Éclair", costPerUnit: null},
      metric(),
    );

    const sorted = sortProfitability([second, first], "contribution");

    expect(sorted.map((row) => row.itemId)).toEqual([
      "item_baguette",
      "item_2",
    ]);
  });
});
