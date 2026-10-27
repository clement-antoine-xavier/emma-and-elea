import {prisma} from "@/lib/prisma";

export type ForecastItem = {
  itemId: string;
  itemCode: string;
  itemName: string;
  stockUnitId: string;
  stockUnitCode: string;
  stockUnitKind: "MASS" | "VOLUME" | "COUNT" | "LENGTH";
  stockUnitFactorToBase: string;
  recipeId: string;
  recipeName: string;
  recipeVersionId: string;
  yieldUnitId: string;
  yieldUnitCode: string;
  yieldUnitKind: "MASS" | "VOLUME" | "COUNT" | "LENGTH";
  yieldUnitFactorToBase: string;
};

export type SalesHistoryRow = {
  itemId: string;
  businessDate: Date;
  quantity: string;
  unitKind: "MASS" | "VOLUME" | "COUNT" | "LENGTH";
  unitFactorToBase: string;
};

export type OrderDemandRow = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderLineId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: string;
  fulfilledQuantity: string;
  unitKind: "MASS" | "VOLUME" | "COUNT" | "LENGTH";
  unitFactorToBase: string;
  stockUnitId: string;
  stockUnitCode: string;
  stockUnitKind: "MASS" | "VOLUME" | "COUNT" | "LENGTH";
  stockUnitFactorToBase: string;
};

export interface ForecastRepository {
  listItems(organizationId: string): Promise<ForecastItem[]>;
  salesHistory(
    organizationId: string,
    siteId: string,
    from: Date,
    to: Date,
  ): Promise<SalesHistoryRow[]>;
  eventUplift(
    organizationId: string,
    siteId: string,
    date: Date,
  ): Promise<string[]>;
  orderDemand(
    organizationId: string,
    siteId: string,
    plannedFor: Date,
  ): Promise<OrderDemandRow[]>;
}

const unitSelect = {
  kind: true,
  factorToBase: true,
} as const;

export const forecastRepository: ForecastRepository = {
  async listItems(organizationId) {
    const recipes = await prisma.recipe.findMany({
      where: {
        organizationId,
        archivedAt: null,
        currentVersionId: {not: null},
      },
      orderBy: [{outputItem: {name: "asc"}}, {isDefault: "desc"}],
      select: {
        id: true,
        name: true,
        currentVersionId: true,
        currentVersion: {
          select: {
            id: true,
            status: true,
            yieldUnitId: true,
            yieldUnit: {select: {code: true, ...unitSelect}},
          },
        },
        outputItem: {
          select: {
            id: true,
            code: true,
            name: true,
            stockUnitId: true,
            stockUnit: {select: {code: true, ...unitSelect}},
          },
        },
      },
    });

    const seen = new Set<string>();
    return recipes.flatMap((recipe) => {
      const version = recipe.currentVersion;
      if (
        !version ||
        version.status !== "PUBLISHED" ||
        seen.has(recipe.outputItem.id)
      ) {
        return [];
      }
      seen.add(recipe.outputItem.id);

      return [
        {
          itemId: recipe.outputItem.id,
          itemCode: recipe.outputItem.code,
          itemName: recipe.outputItem.name,
          stockUnitId: recipe.outputItem.stockUnitId,
          stockUnitCode: recipe.outputItem.stockUnit.code,
          stockUnitKind: recipe.outputItem.stockUnit.kind,
          stockUnitFactorToBase:
            recipe.outputItem.stockUnit.factorToBase.toString(),
          recipeId: recipe.id,
          recipeName: recipe.name,
          recipeVersionId: version.id,
          yieldUnitId: version.yieldUnitId,
          yieldUnitCode: version.yieldUnit.code,
          yieldUnitKind: version.yieldUnit.kind,
          yieldUnitFactorToBase: version.yieldUnit.factorToBase.toString(),
        },
      ];
    });
  },

  async salesHistory(organizationId, siteId, from, to) {
    const rows = await prisma.salesDaily.findMany({
      where: {
        organizationId,
        siteId,
        businessDate: {gte: from, lte: to},
      },
      select: {
        itemId: true,
        businessDate: true,
        quantitySold: true,
        unit: {select: unitSelect},
      },
    });

    return rows.map((row) => ({
      itemId: row.itemId,
      businessDate: row.businessDate,
      quantity: row.quantitySold.toString(),
      unitKind: row.unit.kind,
      unitFactorToBase: row.unit.factorToBase.toString(),
    }));
  },

  async eventUplift(organizationId, siteId, date) {
    const events = await prisma.event.findMany({
      where: {
        organizationId,
        archivedAt: null,
        startsOn: {lte: date},
        endsOn: {gte: date},
        OR: [{siteId}, {siteId: null}],
      },
      select: {expectedUpliftPct: true},
    });

    return events.flatMap((event) =>
      event.expectedUpliftPct ? [event.expectedUpliftPct.toString()] : [],
    );
  },

  async orderDemand(organizationId, siteId, plannedFor) {
    const orders = await prisma.order.findMany({
      where: {
        organizationId,
        siteId,
        requestedFor: plannedFor,
        status: {in: ["CONFIRMED", "IN_PRODUCTION", "READY"]},
      },
      orderBy: {number: "asc"},
      select: {
        id: true,
        number: true,
        customer: {select: {name: true}},
        lines: {
          orderBy: {createdAt: "asc"},
          select: {
            id: true,
            itemId: true,
            item: {
              select: {
                code: true,
                name: true,
                stockUnitId: true,
                stockUnit: {select: {code: true, ...unitSelect}},
              },
            },
            quantity: true,
            fulfilledQuantity: true,
            unit: {select: unitSelect},
          },
        },
      },
    });

    return orders.flatMap((order) =>
      order.lines.map((line) => ({
        orderId: order.id,
        orderNumber: order.number,
        customerName: order.customer.name,
        orderLineId: line.id,
        itemId: line.itemId,
        itemCode: line.item.code,
        itemName: line.item.name,
        quantity: line.quantity.toString(),
        fulfilledQuantity: line.fulfilledQuantity.toString(),
        unitKind: line.unit.kind,
        unitFactorToBase: line.unit.factorToBase.toString(),
        stockUnitId: line.item.stockUnitId,
        stockUnitCode: line.item.stockUnit.code,
        stockUnitKind: line.item.stockUnit.kind,
        stockUnitFactorToBase: line.item.stockUnit.factorToBase.toString(),
      })),
    );
  },
};
