import {Decimal} from "@prisma/client/runtime/client";
import {prisma} from "@/lib/prisma";
import type {Prisma} from "@/generated/prisma/client";
import type {
  LotDetailRecord,
  LotSummaryRecord,
  StockLevelRecord,
  StockMovementRecord,
} from "@/lib/dto";
import {convertQuantity, roundQuantity} from "@/server/domain/units";

export type LotFilters = {
  search: string;
  includeEmpty: boolean;
  skip: number;
  take: number;
};

export type LotPage = {
  lots: LotSummaryRecord[];
  total: number;
};

export interface StockRepository {
  listLevels(organizationId: string): Promise<StockLevelRecord[]>;
  openDraftQuantities(organizationId: string): Promise<Record<string, string>>;
  listLots(
    organizationId: string,
    filters: LotFilters,
  ): Promise<LotPage>;
  findLot(
    organizationId: string,
    id: string,
  ): Promise<LotDetailRecord | null>;
}

const lotSelect = {
  id: true,
  lotNumber: true,
  itemId: true,
  item: {
    select: {
      code: true,
      name: true,
      stockUnit: {select: {code: true}},
    },
  },
  siteId: true,
  site: {select: {name: true}},
  quantityRemaining: true,
  unitCost: true,
  currency: true,
  receivedAt: true,
  expiresOn: true,
  status: true,
} as const;

type SelectedLot = {
  id: string;
  lotNumber: string;
  itemId: string;
  item: {code: string; name: string; stockUnit: {code: string}};
  siteId: string;
  site: {name: string};
  quantityRemaining: {toString(): string};
  unitCost: {toString(): string};
  currency: string;
  receivedAt: Date;
  expiresOn: Date | null;
  status: string;
};

function toLotSummary(lot: SelectedLot): LotSummaryRecord {
  return {
    id: lot.id,
    lotNumber: lot.lotNumber,
    itemId: lot.itemId,
    itemCode: lot.item.code,
    itemName: lot.item.name,
    siteId: lot.siteId,
    siteName: lot.site.name,
    quantityRemaining: lot.quantityRemaining.toString(),
    unitCode: lot.item.stockUnit.code,
    unitCost: lot.unitCost.toString(),
    currency: lot.currency,
    receivedAt: lot.receivedAt,
    expiresOn: lot.expiresOn,
    status: lot.status as LotSummaryRecord["status"],
  };
}

export const stockRepository: StockRepository = {
  async listLevels(organizationId) {
    const grouped = await prisma.lot.groupBy({
      by: ["siteId", "itemId"],
      where: {
        organizationId,
        status: "AVAILABLE",
        quantityRemaining: {gt: 0},
      },
      _sum: {quantityRemaining: true},
    });

    const itemIds = [...new Set(grouped.map((row) => row.itemId))];
    const siteIds = [...new Set(grouped.map((row) => row.siteId))];

    const [items, sites] = await Promise.all([
      prisma.item.findMany({
        where: {organizationId, id: {in: itemIds}},
        select: {
          id: true,
          code: true,
          name: true,
          minStockQuantity: true,
          parLevelQuantity: true,
          stockUnit: {select: {id: true, code: true}},
        },
      }),
      prisma.site.findMany({
        where: {organizationId, id: {in: siteIds}},
        select: {id: true, name: true},
      }),
    ]);

    const itemById = new Map(items.map((item) => [item.id, item]));
    const siteById = new Map(sites.map((site) => [site.id, site]));

    return grouped
      .flatMap((row) => {
        const item = itemById.get(row.itemId);
        const site = siteById.get(row.siteId);
        if (!item || !site) return [];

        const quantity = new Decimal(
          row._sum.quantityRemaining?.toString() ?? "0",
        );
        const minimum = item.minStockQuantity
          ? new Decimal(item.minStockQuantity.toString())
          : null;

        return [
          {
            itemId: item.id,
            itemCode: item.code,
            itemName: item.name,
            siteId: site.id,
            siteName: site.name,
            unitId: item.stockUnit.id,
            unitCode: item.stockUnit.code,
            quantity: quantity.toString(),
            minStockQuantity: minimum?.toString() ?? null,
            parLevelQuantity:
              item.parLevelQuantity?.toString() ?? null,
            isBelowMin: minimum !== null && quantity.lessThan(minimum),
          },
        ];
      })
      .sort(
        (a, b) =>
          a.itemName.localeCompare(b.itemName) ||
          a.siteName.localeCompare(b.siteName),
      );
  },

  async openDraftQuantities(organizationId) {
    const lines = await prisma.purchaseReceiptLine.findMany({
      where: {
        organizationId,
        purchaseReceipt: {status: "DRAFT"},
      },
      select: {
        itemId: true,
        quantity: true,
        unit: {select: {code: true, kind: true, factorToBase: true}},
        item: {
          select: {
            stockUnit: {select: {code: true, kind: true, factorToBase: true}},
          },
        },
        purchaseReceipt: {select: {siteId: true}},
      },
    });

    const totals = new Map<string, Decimal>();

    for (const line of lines) {
      const key = `${line.purchaseReceipt.siteId}:${line.itemId}`;
      try {
        const quantity = roundQuantity(
          convertQuantity(
            line.quantity,
            {
              code: line.unit.code,
              kind: line.unit.kind as "MASS" | "VOLUME" | "COUNT" | "LENGTH",
              factorToBase: line.unit.factorToBase.toString(),
            },
            {
              code: line.item.stockUnit.code,
              kind: line.item.stockUnit
                .kind as "MASS" | "VOLUME" | "COUNT" | "LENGTH",
              factorToBase: line.item.stockUnit.factorToBase.toString(),
            },
          ),
        );
        totals.set(key, (totals.get(key) ?? new Decimal(0)).plus(quantity));
      } catch {
        // Incompatible units cannot be compared to stock; skip the line.
      }
    }

    return Object.fromEntries(
      [...totals.entries()].map(([key, value]) => [key, value.toString()]),
    );
  },

  async listLots(organizationId, filters) {
    const where: Prisma.LotWhereInput = {
      organizationId,
      quantityRemaining: filters.includeEmpty ? undefined : {gt: 0},
      OR: filters.search
        ? [
            {lotNumber: {contains: filters.search, mode: "insensitive"}},
            {
              item: {
                name: {contains: filters.search, mode: "insensitive"},
              },
            },
            {
              item: {
                code: {contains: filters.search, mode: "insensitive"},
              },
            },
          ]
        : undefined,
    };

    const [total, lots] = await prisma.$transaction([
      prisma.lot.count({where}),
      prisma.lot.findMany({
        where,
        orderBy: [{receivedAt: "desc"}, {lotNumber: "asc"}],
        skip: filters.skip,
        take: filters.take,
        select: lotSelect,
      }),
    ]);

    return {lots: lots.map(toLotSummary), total};
  },

  async findLot(organizationId, id) {
    const lot = await prisma.lot.findFirst({
      where: {id, organizationId},
      select: {
        ...lotSelect,
        quantityReceived: true,
        stockMovements: {
          orderBy: {occurredAt: "desc"},
          select: {
            id: true,
            type: true,
            quantity: true,
            unit: {select: {code: true}},
            occurredAt: true,
            referenceType: true,
            reason: true,
          },
        },
      },
    });

    if (!lot) return null;

    const movements: StockMovementRecord[] = lot.stockMovements.map((movement) => ({
      id: movement.id,
      type: movement.type as StockMovementRecord["type"],
      quantity: movement.quantity.toString(),
      unitCode: movement.unit.code,
      occurredAt: movement.occurredAt,
      referenceType: movement.referenceType,
      reason: movement.reason,
    }));

    return {
      ...toLotSummary(lot),
      quantityReceived: lot.quantityReceived.toString(),
      movements,
    };
  },
};
