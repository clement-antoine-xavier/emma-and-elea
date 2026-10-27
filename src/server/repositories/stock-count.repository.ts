import {prisma} from "@/lib/prisma";
import type {
  StockCountDetailRecord,
  StockCountStatusName,
  StockCountSummaryRecord,
} from "@/lib/dto";
import {DomainError} from "@/server/domain/errors";
import {countMovements} from "@/server/domain/stock-count";
import {withTransaction} from "./transaction";

export type StockCountCreateInput = {
  siteId: string;
  countedAt: Date;
  note: string | null;
  userId: string;
};

export type StockCountLineUpdate = {
  id: string;
  countedQuantity: string;
  variance: string;
};

export interface StockCountRepository {
  listCounts(organizationId: string): Promise<StockCountSummaryRecord[]>;
  findCount(
    organizationId: string,
    id: string,
  ): Promise<StockCountDetailRecord | null>;
  findDraft(
    organizationId: string,
    siteId: string,
    countedAt: Date,
  ): Promise<StockCountSummaryRecord | null>;
  createCount(
    organizationId: string,
    input: StockCountCreateInput,
  ): Promise<string>;
  updateLines(
    organizationId: string,
    countId: string,
    updates: readonly StockCountLineUpdate[],
  ): Promise<void>;
  post(
    organizationId: string,
    countId: string,
    userId: string,
  ): Promise<void>;
  cancel(organizationId: string, countId: string): Promise<void>;
}

const summarySelect = {
  id: true,
  siteId: true,
  status: true,
  countedAt: true,
  postedAt: true,
  createdAt: true,
  site: {select: {name: true}},
  _count: {select: {lines: true}},
} as const;

type SelectedSummary = {
  id: string;
  siteId: string;
  status: string;
  countedAt: Date;
  postedAt: Date | null;
  createdAt: Date;
  site: {name: string};
  _count: {lines: number};
};

function toSummary(count: SelectedSummary): StockCountSummaryRecord {
  return {
    id: count.id,
    siteId: count.siteId,
    siteName: count.site.name,
    status: count.status as StockCountStatusName,
    countedAt: count.countedAt,
    postedAt: count.postedAt,
    lineCount: count._count.lines,
    createdAt: count.createdAt,
  };
}

export const stockCountRepository: StockCountRepository = {
  async listCounts(organizationId) {
    const counts = await prisma.stockCount.findMany({
      where: {organizationId},
      orderBy: [{countedAt: "desc"}, {createdAt: "desc"}],
      select: summarySelect,
    });

    return counts.map(toSummary);
  },

  async findCount(organizationId, id) {
    const count = await prisma.stockCount.findFirst({
      where: {id, organizationId},
      select: {
        ...summarySelect,
        note: true,
        lines: {
          orderBy: {createdAt: "asc"},
          select: {
            id: true,
            lotId: true,
            lot: {select: {lotNumber: true}},
            itemId: true,
            item: {select: {code: true, name: true}},
            expectedQuantity: true,
            countedQuantity: true,
            variance: true,
            unitId: true,
            unit: {select: {code: true}},
            note: true,
          },
        },
      },
    });

    if (!count) return null;

    return {
      ...toSummary(count),
      note: count.note,
      lines: count.lines.map((line) => ({
        id: line.id,
        lotId: line.lotId,
        lotNumber: line.lot?.lotNumber ?? null,
        itemId: line.itemId,
        itemCode: line.item.code,
        itemName: line.item.name,
        expectedQuantity: line.expectedQuantity.toString(),
        countedQuantity: line.countedQuantity.toString(),
        variance: line.variance.toString(),
        unitId: line.unitId,
        unitCode: line.unit.code,
        note: line.note,
      })),
    };
  },

  async findDraft(organizationId, siteId, countedAt) {
    const count = await prisma.stockCount.findFirst({
      where: {organizationId, siteId, countedAt, status: "DRAFT"},
      select: summarySelect,
    });

    return count ? toSummary(count) : null;
  },

  async createCount(organizationId, input) {
    return withTransaction(async (tx) => {
      const lots = await tx.lot.findMany({
        where: {
          organizationId,
          siteId: input.siteId,
          status: "AVAILABLE",
          quantityRemaining: {gt: 0},
        },
        orderBy: [{item: {name: "asc"}}, {lotNumber: "asc"}],
        select: {
          id: true,
          itemId: true,
          item: {select: {stockUnitId: true}},
          quantityRemaining: true,
        },
      });

      if (lots.length === 0) throw new DomainError("INVALID_INPUT");

      const count = await tx.stockCount.create({
        data: {
          organizationId,
          siteId: input.siteId,
          countedAt: input.countedAt,
          countedById: input.userId,
          note: input.note,
          status: "DRAFT",
          lines: {
            create: lots.map((lot) => ({
              organizationId,
              itemId: lot.itemId,
              lotId: lot.id,
              expectedQuantity: lot.quantityRemaining,
              countedQuantity: lot.quantityRemaining,
              variance: 0,
              unitId: lot.item.stockUnitId,
            })),
          },
        },
        select: {id: true},
      });

      return count.id;
    });
  },

  async updateLines(organizationId, countId, updates) {
    await withTransaction(async (tx) => {
      const count = await tx.stockCount.findFirst({
        where: {id: countId, organizationId},
        select: {status: true},
      });
      if (!count) throw new DomainError("NOT_FOUND");
      if (count.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      for (const update of updates) {
        const result = await tx.stockCountLine.updateMany({
          where: {id: update.id, stockCountId: countId, organizationId},
          data: {
            countedQuantity: update.countedQuantity,
            variance: update.variance,
          },
        });
        if (result.count === 0) throw new DomainError("NOT_FOUND");
      }
    });
  },

  async post(organizationId, countId, userId) {
    await withTransaction(async (tx) => {
      const count = await tx.stockCount.findFirst({
        where: {id: countId, organizationId},
        select: {
          id: true,
          siteId: true,
          status: true,
          lines: {
            select: {
              id: true,
              lotId: true,
              itemId: true,
              unitId: true,
              expectedQuantity: true,
              countedQuantity: true,
              note: true,
            },
          },
        },
      });
      if (!count) throw new DomainError("NOT_FOUND");
      if (count.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }
      if (count.lines.length === 0) throw new DomainError("INVALID_INPUT");

      const movements = countMovements(
        count.id,
        count.lines.map((line) => ({
          lotId: line.lotId,
          itemId: line.itemId,
          unitId: line.unitId,
          expectedQuantity: line.expectedQuantity,
          countedQuantity: line.countedQuantity,
        })),
      );

      for (const line of count.lines) {
        if (!line.lotId) continue;
        const updated = await tx.lot.updateMany({
          where: {id: line.lotId, organizationId},
          data: {quantityRemaining: line.countedQuantity},
        });
        if (updated.count === 0) throw new DomainError("NOT_FOUND");
      }

      if (movements.length > 0) {
        await tx.stockMovement.createMany({
          data: movements.map((movement) => ({
            organizationId,
            siteId: count.siteId,
            itemId: movement.itemId,
            lotId: movement.lotId,
            type: "COUNT" as const,
            quantity: movement.quantity,
            unitId: movement.unitId,
            occurredAt: new Date(),
            referenceType: movement.referenceType,
            referenceId: movement.referenceId,
            reason: movement.reason,
            createdById: userId,
          })),
        });
      }

      await tx.stockCount.update({
        where: {id: count.id},
        data: {status: "POSTED", postedAt: new Date()},
      });
    });
  },

  async cancel(organizationId, countId) {
    const result = await prisma.stockCount.updateMany({
      where: {id: countId, organizationId, status: "DRAFT"},
      data: {status: "CANCELLED"},
    });
    if (result.count === 0) {
      throw new DomainError("INVALID_STATE_TRANSITION");
    }
  },
};
