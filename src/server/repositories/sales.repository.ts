import {prisma} from "@/lib/prisma";
import type {DailySalesRecord} from "@/lib/dto";

export type DailySalesInput = {
  siteId: string;
  itemId: string;
  businessDate: Date;
  channel: "RETAIL" | "WHOLESALE" | "BOTH" | "NONE";
  quantitySold: string;
  revenue: string;
  currency: string;
  unitId: string;
  note: string | null;
};

export interface SalesRepository {
  list(
    organizationId: string,
    filters: {from: Date; to: Date; siteId: string | null},
  ): Promise<DailySalesRecord[]>;
  upsert(organizationId: string, input: DailySalesInput): Promise<void>;
}

export const salesRepository: SalesRepository = {
  async list(organizationId, filters) {
    const rows = await prisma.salesDaily.findMany({
      where: {
        organizationId,
        businessDate: {gte: filters.from, lte: filters.to},
        siteId: filters.siteId ?? undefined,
      },
      orderBy: [{businessDate: "desc"}, {item: {name: "asc"}}],
      select: {
        id: true,
        businessDate: true,
        siteId: true,
        site: {select: {name: true}},
        itemId: true,
        item: {select: {name: true}},
        quantitySold: true,
        unit: {select: {code: true}},
        revenue: true,
        currency: true,
        channel: true,
        source: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      businessDate: row.businessDate,
      siteId: row.siteId,
      siteName: row.site.name,
      itemId: row.itemId,
      itemName: row.item.name,
      quantitySold: row.quantitySold.toString(),
      unitCode: row.unit.code,
      revenue: row.revenue.toString(),
      currency: row.currency,
      channel: row.channel as DailySalesRecord["channel"],
      source: row.source,
    }));
  },

  async upsert(organizationId, input) {
    await prisma.salesDaily.upsert({
      where: {
        siteId_itemId_businessDate_channel: {
          siteId: input.siteId,
          itemId: input.itemId,
          businessDate: input.businessDate,
          channel: input.channel,
        },
      },
      create: {
        organizationId,
        ...input,
        source: "MANUAL",
      },
      update: {
        quantitySold: input.quantitySold,
        revenue: input.revenue,
        currency: input.currency,
        note: input.note,
        source: "MANUAL",
      },
    });
  },
};
