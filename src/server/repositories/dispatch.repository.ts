import {prisma} from "@/lib/prisma";
import type {Prisma} from "@/generated/prisma/client";
import {DomainError} from "@/server/domain/errors";
import {
  convertQuantity,
  roundQuantity,
} from "@/server/domain/units";
import {nextDocumentSequence, receiptNumberPrefix} from "@/server/domain/receipt";
import type {
  DispatchDetailRecord,
  DispatchLineRecord,
  DispatchStatusName,
  DispatchSummaryRecord,
} from "@/lib/dto";
import {withTransaction} from "./transaction";

export type DispatchInput = {
  siteId: string;
  customerId: string | null;
  orderId: string | null;
  carrier: string | null;
  note: string | null;
};

export type DispatchLineInput = {
  lotId: string;
  itemId: string;
  unitId: string;
  quantity: string;
  unitPrice: string | null;
  note: string | null;
};

export type DispatchFilters = {
  search: string;
  status: DispatchStatusName | null;
  skip: number;
  take: number;
};

export interface DispatchRepository {
  list(
    organizationId: string,
    filters: DispatchFilters,
  ): Promise<{dispatches: DispatchSummaryRecord[]; total: number}>;
  find(
    organizationId: string,
    id: string,
  ): Promise<DispatchDetailRecord | null>;
  create(organizationId: string, input: DispatchInput): Promise<string>;
  addLine(
    organizationId: string,
    dispatchId: string,
    input: DispatchLineInput,
  ): Promise<void>;
  removeLine(
    organizationId: string,
    dispatchId: string,
    lineId: string,
  ): Promise<void>;
  post(organizationId: string, dispatchId: string): Promise<void>;
  cancel(organizationId: string, dispatchId: string): Promise<void>;
  findLot(
    organizationId: string,
    lotId: string,
  ): Promise<{
    id: string;
    siteId: string;
    itemId: string;
    itemName: string;
    unitId: string;
    unitCode: string;
    quantityRemaining: string;
  } | null>;
  options(organizationId: string): Promise<{
    customers: {id: string; name: string; code: string | null}[];
    sites: {id: string; name: string; code: string}[];
    orders: {id: string; number: string; customerName: string}[];
    lots: {
      id: string;
      lotNumber: string;
      itemId: string;
      itemName: string;
      siteId: string;
      unitId: string;
      unitCode: string;
      quantityRemaining: string;
    }[];
  }>;
}

const dispatchSummarySelect = {
  id: true,
  number: true,
  status: true,
  dispatchedAt: true,
  createdAt: true,
  customer: {select: {name: true}},
  site: {select: {name: true}},
  order: {select: {number: true}},
  _count: {select: {lines: true}},
} as const;

type SelectedDispatch = {
  id: string;
  number: string;
  status: string;
  dispatchedAt: Date | null;
  createdAt: Date;
  customer: {name: string} | null;
  site: {name: string};
  order: {number: string} | null;
  _count: {lines: number};
};

function toSummary(dispatch: SelectedDispatch): DispatchSummaryRecord {
  return {
    id: dispatch.id,
    number: dispatch.number,
    customerName: dispatch.customer?.name ?? null,
    siteName: dispatch.site.name,
    orderNumber: dispatch.order?.number ?? null,
    status: dispatch.status as DispatchStatusName,
    dispatchedAt: dispatch.dispatchedAt,
    lineCount: dispatch._count.lines,
    createdAt: dispatch.createdAt,
  };
}

export const dispatchRepository: DispatchRepository = {
  async list(organizationId, filters) {
    const where: Prisma.DispatchWhereInput = {
      organizationId,
      status: filters.status ?? undefined,
      OR: filters.search
        ? [
            {number: {contains: filters.search, mode: "insensitive"}},
            {
              customer: {
                name: {contains: filters.search, mode: "insensitive"},
              },
            },
          ]
        : undefined,
    };

    const [total, dispatches] = await prisma.$transaction([
      prisma.dispatch.count({where}),
      prisma.dispatch.findMany({
        where,
        orderBy: {createdAt: "desc"},
        skip: filters.skip,
        take: filters.take,
        select: dispatchSummarySelect,
      }),
    ]);

    return {dispatches: dispatches.map(toSummary), total};
  },

  async find(organizationId, id) {
    const dispatch = await prisma.dispatch.findFirst({
      where: {id, organizationId},
      select: {
        ...dispatchSummarySelect,
        customerId: true,
        siteId: true,
        orderId: true,
        carrier: true,
        note: true,
        lines: {
          orderBy: {createdAt: "asc"},
          select: {
            id: true,
            itemId: true,
            item: {select: {code: true, name: true}},
            lotId: true,
            lot: {select: {lotNumber: true}},
            quantity: true,
            unit: {select: {code: true}},
            unitPrice: true,
          },
        },
      },
    });

    if (!dispatch) return null;

    const lines: DispatchLineRecord[] = dispatch.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemCode: line.item.code,
      itemName: line.item.name,
      lotId: line.lotId,
      lotNumber: line.lot.lotNumber,
      quantity: line.quantity.toString(),
      unitCode: line.unit.code,
      unitPrice: line.unitPrice?.toString() ?? null,
    }));

    return {
      ...toSummary(dispatch),
      customerId: dispatch.customerId,
      siteId: dispatch.siteId,
      orderId: dispatch.orderId,
      carrier: dispatch.carrier,
      note: dispatch.note,
      lines,
    };
  },

  async create(organizationId, input) {
    return withTransaction(async (tx) => {
      const now = new Date();
      const prefix = receiptNumberPrefix(now).replace("GR", "DSP");
      const existing = await tx.dispatch.findMany({
        where: {organizationId, number: {startsWith: prefix}},
        select: {number: true},
      });
      const sequence = nextDocumentSequence(
        existing.map((dispatch) => dispatch.number),
        prefix,
      );
      const dispatch = await tx.dispatch.create({
        data: {
          organizationId,
          ...input,
          number: `${prefix}-${String(sequence).padStart(3, "0")}`,
          status: "DRAFT",
        },
        select: {id: true},
      });

      return dispatch.id;
    });
  },

  async addLine(organizationId, dispatchId, input) {
    await withTransaction(async (tx) => {
      const dispatch = await tx.dispatch.findFirst({
        where: {id: dispatchId, organizationId},
        select: {status: true},
      });
      if (!dispatch) throw new DomainError("NOT_FOUND");
      if (dispatch.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      await tx.dispatchLine.create({
        data: {organizationId, dispatchId, ...input},
      });
    });
  },

  async removeLine(organizationId, dispatchId, lineId) {
    await withTransaction(async (tx) => {
      const dispatch = await tx.dispatch.findFirst({
        where: {id: dispatchId, organizationId},
        select: {status: true},
      });
      if (!dispatch) throw new DomainError("NOT_FOUND");
      if (dispatch.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const result = await tx.dispatchLine.deleteMany({
        where: {id: lineId, dispatchId, organizationId},
      });
      if (result.count === 0) throw new DomainError("NOT_FOUND");
    });
  },

  async post(organizationId, dispatchId) {
    await withTransaction(async (tx) => {
      const dispatch = await tx.dispatch.findFirst({
        where: {id: dispatchId, organizationId},
        select: {
          id: true,
          status: true,
          siteId: true,
          orderId: true,
          lines: {
            select: {
              id: true,
              lotId: true,
              itemId: true,
              quantity: true,
              unitId: true,
              unit: {
                select: {
                  id: true,
                  code: true,
                  kind: true,
                  factorToBase: true,
                  isBase: true,
                },
              },
            },
          },
        },
      });
      if (!dispatch) throw new DomainError("NOT_FOUND");
      if (dispatch.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }
      if (dispatch.lines.length === 0) {
        throw new DomainError("INVALID_INPUT");
      }

      const dispatchedAt = new Date();

      for (const line of dispatch.lines) {
        const decremented = await tx.lot.updateMany({
          where: {
            id: line.lotId,
            organizationId,
            status: "AVAILABLE",
            quantityRemaining: {gte: line.quantity},
          },
          data: {quantityRemaining: {decrement: line.quantity}},
        });
        if (decremented.count === 0) {
          throw new DomainError("INSUFFICIENT_STOCK");
        }

        await tx.stockMovement.create({
          data: {
            organizationId,
            siteId: dispatch.siteId,
            itemId: line.itemId,
            lotId: line.lotId,
            type: "DISPATCH",
            quantity: `-${line.quantity}`,
            unitId: line.unitId,
            occurredAt: dispatchedAt,
            referenceType: "DISPATCH",
            referenceId: dispatch.id,
          },
        });

        if (dispatch.orderId) {
          const orderLine = await tx.orderLine.findFirst({
            where: {
              orderId: dispatch.orderId,
              itemId: line.itemId,
            },
            select: {
              id: true,
              fulfilledQuantity: true,
              quantity: true,
              unit: {
                select: {
                  id: true,
                  code: true,
                  kind: true,
                  factorToBase: true,
                  isBase: true,
                },
              },
            },
            orderBy: {createdAt: "asc"},
          });

          if (orderLine) {
            const fulfilled = orderLine.fulfilledQuantity.plus(
              roundQuantity(
                convertQuantity(line.quantity, line.unit, orderLine.unit),
              ),
            );
            await tx.orderLine.update({
              where: {id: orderLine.id},
              data: {fulfilledQuantity: fulfilled},
            });
          }
        }
      }

      if (dispatch.orderId) {
        const orderLines = await tx.orderLine.findMany({
          where: {orderId: dispatch.orderId},
          select: {quantity: true, fulfilledQuantity: true},
        });
        const allFulfilled = orderLines.every((line) =>
          line.fulfilledQuantity.greaterThanOrEqualTo(line.quantity),
        );
        await tx.order.update({
          where: {id: dispatch.orderId},
          data: {status: allFulfilled ? "DELIVERED" : "READY"},
        });
      }

      await tx.dispatch.update({
        where: {id: dispatch.id},
        data: {status: "DISPATCHED", dispatchedAt},
      });
    });
  },

  async cancel(organizationId, dispatchId) {
    const result = await prisma.dispatch.updateMany({
      where: {id: dispatchId, organizationId, status: "DRAFT"},
      data: {status: "CANCELLED"},
    });
    if (result.count === 0) throw new DomainError("INVALID_STATE_TRANSITION");
  },

  async findLot(organizationId, lotId) {
    const lot = await prisma.lot.findFirst({
      where: {id: lotId, organizationId, status: "AVAILABLE"},
      select: {
        id: true,
        siteId: true,
        itemId: true,
        item: {select: {name: true, stockUnit: {select: {id: true, code: true}}}},
        quantityRemaining: true,
        status: true,
      },
    });

    if (!lot) return null;

    return {
      id: lot.id,
      siteId: lot.siteId,
      itemId: lot.itemId,
      itemName: lot.item.name,
      unitId: lot.item.stockUnit.id,
      unitCode: lot.item.stockUnit.code,
      quantityRemaining: lot.quantityRemaining.toString(),
    };
  },

  async options(organizationId) {
    const [customers, sites, orders, lots] = await Promise.all([
      prisma.customer.findMany({
        where: {organizationId, archivedAt: null},
        orderBy: {name: "asc"},
        select: {id: true, name: true, code: true},
      }),
      prisma.site.findMany({
        where: {organizationId, archivedAt: null},
        orderBy: {name: "asc"},
        select: {id: true, name: true, code: true},
      }),
      prisma.order.findMany({
        where: {
          organizationId,
          status: {in: ["CONFIRMED", "IN_PRODUCTION", "READY"]},
        },
        orderBy: {requestedFor: "asc"},
        select: {
          id: true,
          number: true,
          customer: {select: {name: true}},
        },
      }),
      prisma.lot.findMany({
        where: {
          organizationId,
          status: "AVAILABLE",
          quantityRemaining: {gt: 0},
        },
        orderBy: [{expiresOn: "asc"}, {receivedAt: "asc"}],
        select: {
          id: true,
          lotNumber: true,
          itemId: true,
          item: {
            select: {
              name: true,
              stockUnit: {select: {id: true, code: true}},
            },
          },
          siteId: true,
          quantityRemaining: true,
        },
      }),
    ]);

    return {
      customers,
      sites,
      orders: orders.map((order) => ({
        id: order.id,
        number: order.number,
        customerName: order.customer.name,
      })),
      lots: lots.map((lot) => ({
        id: lot.id,
        lotNumber: lot.lotNumber,
        itemId: lot.itemId,
        itemName: lot.item.name,
        siteId: lot.siteId,
        unitId: lot.item.stockUnit.id,
        unitCode: lot.item.stockUnit.code,
        quantityRemaining: lot.quantityRemaining.toString(),
      })),
    };
  },
};
