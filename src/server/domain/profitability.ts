import {Decimal} from "@prisma/client/runtime/client";
import type {
  CategoryProfitabilityRecord,
  ProductProfitabilityRecord,
} from "@/lib/dto";
import type {ProfitabilitySort} from "@/lib/profitability";

/**
 * Product profitability combines four ledgers over the same period:
 *
 * - produced: completed batch outputs, converted to the item stock unit;
 * - sold: daily retail sales plus dispatched wholesale lines (ADR-0015 keeps
 *   them apart, so both must be added);
 * - waste: recorded waste, converted to the stock unit;
 * - revenue: daily sales revenue plus priced dispatch lines.
 *
 * Unsold is an estimate, not an accounting balance: stock carried in from a
 * previous period can make sold exceed produced, in which case the raw variance
 * stays visible and the unsold figure is clamped at zero.
 */
export type ProfitabilityItem = {
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  categoryName: string | null;
  recipeId: string | null;
  recipeName: string | null;
  salePrice: string | null;
  costPerUnit: string | null;
  currency: string;
  costComputedAt: Date | null;
};

export type ProfitabilityMetric = {
  produced: string;
  sold: string;
  waste: string;
  revenue: string;
  wasteCost: string;
  /** True when at least one dispatched line had no unit price. */
  missingRevenue: boolean;
};

function quantity(value: Decimal | number | string): Decimal {
  return new Decimal(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
}

function percent(value: Decimal): string {
  return value
    .mul(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toString();
}

export function productProfitability(
  item: ProfitabilityItem,
  metric: ProfitabilityMetric,
): ProductProfitabilityRecord {
  const produced = quantity(metric.produced);
  const sold = quantity(metric.sold);
  const waste = quantity(metric.waste);
  const revenue = quantity(metric.revenue);
  const variance = produced.minus(sold).minus(waste);
  const unsold = variance.isNegative() ? new Decimal(0) : variance;

  const costPerUnit = item.costPerUnit
    ? new Decimal(item.costPerUnit)
    : null;
  const costOfSold =
    costPerUnit && sold.greaterThan(0) ? sold.mul(costPerUnit) : null;
  const contribution = costOfSold ? revenue.minus(costOfSold) : null;
  const salePrice = item.salePrice ? new Decimal(item.salePrice) : null;
  const marginPct =
    salePrice && salePrice.greaterThan(0) && costPerUnit
      ? percent(salePrice.minus(costPerUnit).div(salePrice))
      : null;
  const lossRatePct = produced.greaterThan(0)
    ? percent(waste.div(produced))
    : null;
  const unsoldRatePct = produced.greaterThan(0)
    ? percent(unsold.div(produced))
    : null;

  return {
    itemId: item.itemId,
    itemCode: item.itemCode,
    itemName: item.itemName,
    itemType: item.itemType as ProductProfitabilityRecord["itemType"],
    categoryName: item.categoryName,
    recipeId: item.recipeId,
    recipeName: item.recipeName,
    produced: produced.toString(),
    sold: sold.toString(),
    waste: waste.toString(),
    unsold: unsold.toString(),
    variance: variance.toString(),
    wasteCost: quantity(metric.wasteCost).toString(),
    revenue: revenue.toString(),
    costPerUnit: costPerUnit?.toString() ?? null,
    costOfSold: costOfSold?.toString() ?? null,
    contribution: contribution?.toString() ?? null,
    marginPct,
    lossRatePct,
    unsoldRatePct,
    currency: item.currency,
    costComputedAt: item.costComputedAt,
    missingRevenue: metric.missingRevenue,
  };
}

export function categoryProfitability(
  records: readonly ProductProfitabilityRecord[],
): CategoryProfitabilityRecord[] {
  const groups = new Map<
    string,
    {
      productCount: number;
      produced: Decimal;
      sold: Decimal;
      waste: Decimal;
      revenue: Decimal;
      costedRevenue: Decimal;
      contribution: Decimal;
      hasContribution: boolean;
    }
  >();

  for (const record of records) {
    const key = record.categoryName ?? "Uncategorized";
    const group = groups.get(key) ?? {
      productCount: 0,
      produced: new Decimal(0),
      sold: new Decimal(0),
      waste: new Decimal(0),
      revenue: new Decimal(0),
      costedRevenue: new Decimal(0),
      contribution: new Decimal(0),
      hasContribution: false,
    };

    group.productCount += 1;
    group.produced = group.produced.plus(record.produced);
    group.sold = group.sold.plus(record.sold);
    group.waste = group.waste.plus(record.waste);
    group.revenue = group.revenue.plus(record.revenue);
    if (record.contribution !== null) {
      group.contribution = group.contribution.plus(record.contribution);
      group.costedRevenue = group.costedRevenue.plus(record.revenue);
      group.hasContribution = true;
    }

    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([categoryName, group]) => {
      const variance = group.produced.minus(group.sold).minus(group.waste);
      const unsold = variance.isNegative() ? new Decimal(0) : variance;
      return {
        categoryName,
        productCount: group.productCount,
        produced: quantity(group.produced).toString(),
        sold: quantity(group.sold).toString(),
        waste: quantity(group.waste).toString(),
        unsold: quantity(unsold).toString(),
        revenue: quantity(group.revenue).toString(),
        contribution: group.hasContribution
          ? quantity(group.contribution).toString()
          : null,
        marginPct:
          group.hasContribution && group.costedRevenue.greaterThan(0)
            ? percent(group.contribution.div(group.costedRevenue))
            : null,
        lossRatePct: group.produced.greaterThan(0)
          ? percent(group.waste.div(group.produced))
          : null,
        unsoldRatePct: group.produced.greaterThan(0)
          ? percent(unsold.div(group.produced))
          : null,
      };
    })
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

function numeric(value: string | null): number | null {
  return value === null ? null : Number(value);
}

export function sortProfitability(
  records: readonly ProductProfitabilityRecord[],
  sort: ProfitabilitySort,
): ProductProfitabilityRecord[] {
  const sorted = [...records];
  const value = (record: ProductProfitabilityRecord): number | null => {
    switch (sort) {
      case "margin":
        return numeric(record.marginPct);
      case "volume":
        return numeric(record.sold);
      case "unsold":
        return numeric(record.unsoldRatePct);
      case "loss":
        return numeric(record.lossRatePct);
      case "contribution":
      default:
        return numeric(record.contribution);
    }
  };

  sorted.sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === null && right === null) return a.itemName.localeCompare(b.itemName);
    if (left === null) return 1;
    if (right === null) return -1;
    if (left === right) return a.itemName.localeCompare(b.itemName);
    return right - left;
  });

  return sorted;
}
