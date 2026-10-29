import {Decimal} from "@prisma/client/runtime/client";
import {prisma} from "@/lib/prisma";
import {
  convertQuantity,
  roundQuantity,
  type ConvertibleUnit,
} from "@/server/domain/units";
import type {ProfitabilityItem, ProfitabilityMetric} from "@/server/domain/profitability";

type UnitRow = {
  code: string;
  kind: string;
  factorToBase: {toString(): string};
};

function convertible(unit: UnitRow): ConvertibleUnit {
  return {
    code: unit.code,
    kind: unit.kind as ConvertibleUnit["kind"],
    factorToBase: unit.factorToBase.toString(),
  };
}

function toStockUnit(
  quantity: Decimal | string,
  unit: UnitRow,
  stockUnit: UnitRow,
): Decimal {
  try {
    return roundQuantity(
      convertQuantity(quantity, convertible(unit), convertible(stockUnit)),
    );
  } catch {
    // A line recorded in an incompatible unit cannot be compared to stock;
    // leave it out rather than corrupting the aggregate.
    return new Decimal(0);
  }
}

type WorkingMetric = {
  produced: Decimal;
  sold: Decimal;
  waste: Decimal;
  revenue: Decimal;
  wasteCost: Decimal;
  missingRevenue: boolean;
};

function emptyMetric(): WorkingMetric {
  return {
    produced: new Decimal(0),
    sold: new Decimal(0),
    waste: new Decimal(0),
    revenue: new Decimal(0),
    wasteCost: new Decimal(0),
    missingRevenue: false,
  };
}

export type ProfitabilityData = {
  items: ProfitabilityItem[];
  metrics: Record<string, ProfitabilityMetric>;
  currency: string;
};

export interface ProfitabilityRepository {
  getData(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<ProfitabilityData>;
}

export const profitabilityRepository: ProfitabilityRepository = {
  async getData(organizationId, from, to) {
    const [settings, items, recipes, sales, dispatches, outputs, waste] =
      await Promise.all([
        prisma.organizationSetting.findUnique({
          where: {organizationId},
          select: {currency: true},
        }),
        prisma.item.findMany({
          where: {organizationId, archivedAt: null},
          orderBy: {name: "asc"},
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            category: {select: {name: true}},
            salePrice: true,
            stockUnit: {
              select: {code: true, kind: true, factorToBase: true},
            },
          },
        }),
        prisma.recipe.findMany({
          where: {
            organizationId,
            archivedAt: null,
            currentVersionId: {not: null},
          },
          orderBy: {name: "asc"},
          select: {
            id: true,
            name: true,
            outputItemId: true,
            currentVersion: {
              select: {
                costSnapshots: {
                  orderBy: {computedAt: "desc"},
                  take: 1,
                  select: {
                    costPerUnit: true,
                    currency: true,
                    computedAt: true,
                  },
                },
              },
            },
          },
        }),
        prisma.salesDaily.findMany({
          where: {
            organizationId,
            businessDate: {gte: from, lte: to},
          },
          select: {
            itemId: true,
            quantitySold: true,
            revenue: true,
            unit: {select: {code: true, kind: true, factorToBase: true}},
          },
        }),
        prisma.dispatchLine.findMany({
          where: {
            organizationId,
            dispatch: {
              status: "DISPATCHED",
              dispatchedAt: {gte: from, lte: to},
            },
          },
          select: {
            itemId: true,
            quantity: true,
            unitPrice: true,
            unit: {select: {code: true, kind: true, factorToBase: true}},
          },
        }),
        prisma.productionBatchOutput.findMany({
          where: {
            organizationId,
            productionBatch: {
              status: "COMPLETED",
              completedAt: {gte: from, lte: to},
            },
          },
          select: {
            itemId: true,
            quantity: true,
            unit: {select: {code: true, kind: true, factorToBase: true}},
          },
        }),
        prisma.wasteRecord.findMany({
          where: {
            organizationId,
            archivedAt: null,
            recordedAt: {gte: from, lte: to},
          },
          select: {
            itemId: true,
            quantity: true,
            costImpact: true,
            unit: {select: {code: true, kind: true, factorToBase: true}},
          },
        }),
      ]);

    const currency = settings?.currency ?? "EUR";
    const itemById = new Map(items.map((item) => [item.id, item]));
    const metrics = new Map<string, ReturnType<typeof emptyMetric>>();

    const metric = (itemId: string) => {
      const current = metrics.get(itemId) ?? emptyMetric();
      metrics.set(itemId, current);
      return current;
    };

    for (const row of sales) {
      const item = itemById.get(row.itemId);
      if (!item) continue;
      const current = metric(row.itemId);
      current.sold = current.sold.plus(
        toStockUnit(row.quantitySold, row.unit, item.stockUnit),
      );
      current.revenue = current.revenue.plus(row.revenue.toString());
    }

    for (const row of dispatches) {
      const item = itemById.get(row.itemId);
      if (!item) continue;
      const current = metric(row.itemId);
      const quantity = toStockUnit(row.quantity, row.unit, item.stockUnit);
      current.sold = current.sold.plus(quantity);
      if (row.unitPrice === null) {
        current.missingRevenue = true;
      } else {
        current.revenue = current.revenue.plus(
          new Decimal(row.unitPrice.toString()).mul(row.quantity.toString()),
        );
      }
    }

    for (const row of outputs) {
      const item = itemById.get(row.itemId);
      if (!item) continue;
      const current = metric(row.itemId);
      current.produced = current.produced.plus(
        toStockUnit(row.quantity, row.unit, item.stockUnit),
      );
    }

    for (const row of waste) {
      const item = itemById.get(row.itemId);
      if (!item) continue;
      const current = metric(row.itemId);
      current.waste = current.waste.plus(
        toStockUnit(row.quantity, row.unit, item.stockUnit),
      );
      current.wasteCost = current.wasteCost.plus(row.costImpact.toString());
    }

    const costByItem = new Map<
      string,
      {
        recipeId: string;
        recipeName: string;
        costPerUnit: string;
        currency: string;
        computedAt: Date;
      }
    >();

    for (const recipe of recipes) {
      if (costByItem.has(recipe.outputItemId)) continue;
      const snapshot = recipe.currentVersion?.costSnapshots[0];
      if (!snapshot) continue;
      costByItem.set(recipe.outputItemId, {
        recipeId: recipe.id,
        recipeName: recipe.name,
        costPerUnit: snapshot.costPerUnit.toString(),
        currency: snapshot.currency,
        computedAt: snapshot.computedAt,
      });
    }

    const profitabilityItems: ProfitabilityItem[] = items.map((item) => {
      const cost = costByItem.get(item.id);
      return {
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        itemType: item.type,
        categoryName: item.category?.name ?? null,
        recipeId: cost?.recipeId ?? null,
        recipeName: cost?.recipeName ?? null,
        salePrice: item.salePrice?.toString() ?? null,
        costPerUnit: cost?.costPerUnit ?? null,
        currency: cost?.currency ?? currency,
        costComputedAt: cost?.computedAt ?? null,
      };
    });

    const serialized: Record<string, ProfitabilityMetric> = {};
    for (const [itemId, current] of metrics) {
      serialized[itemId] = {
        produced: current.produced.toString(),
        sold: current.sold.toString(),
        waste: current.waste.toString(),
        revenue: current.revenue.toString(),
        wasteCost: current.wasteCost.toString(),
        missingRevenue: current.missingRevenue,
      };
    }

    return {items: profitabilityItems, metrics: serialized, currency};
  },
};
