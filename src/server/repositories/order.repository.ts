import {prisma} from "@/lib/prisma";
import type {Prisma} from "@/generated/prisma/client";
import {Decimal} from "@prisma/client/runtime/client";
import {DomainError} from "@/server/domain/errors";
import {nextDocumentSequence, receiptNumberPrefix} from "@/server/domain/receipt";
import type {
  OrderDetailRecord,
  OrderLineRecord,
  OrderStatusName,
  OrderSummaryRecord,
} from "@/lib/dto";
import {withTransaction} from "./transaction";

export type OrderInput = {
  customerId: string;
  siteId: string;
  requestedFor: Date;
  currency: string;
  note: string | null;
};

export type OrderLineInput = {
  itemId: string;
  quantity: string;
  unitId: string;
  unitPrice: string;
  note: string | null;
};

export type OrderFilters = {
  search: string;
  status: OrderStatusName | null;
  skip: number;
  take: number;
};

export interface OrderRepository {
  list(
    organizationId: string,
    filters: OrderFilters,
  ): Promise<{orders: OrderSummaryRecord[]; total: number}>;
  find(
    organizationId: string,
    id: string,
  ): Promise<OrderDetailRecord | null>;
  findSummary(
    organizationId: string,
    id: string,
  ): Promise<{id: string; status: string; customerId: string} | null>;
  create(organizationId: string, input: OrderInput): Promise<string>;
  addLine(
    organizationId: string,
    orderId: string,
    input: OrderLineInput,
  ): Promise<void>;
  removeLine(
    organizationId: string,
    orderId: string,
    lineId: string,
  ): Promise<void>;
  confirm(organizationId: string, id: string): Promise<void>;
  cancel(organizationId: string, id: string): Promise<void>;
}

const orderSummarySelect = {
  id: true,
  number: true,
  status: true,
  requestedFor: true,
  totalAmount: true,
  currency: true,
  createdAt: true,
  customer: {select: {name: true}},
  site: {select: {name: true}},
  _count: {select: {lines: true}},
} as const;

type SelectedOrder = {
  id: string;
  number: string;
  status: string;
  requestedFor: Date;
  totalAmount: {toString(): string};
  currency: string;
  createdAt: Date;
  customer: {name: string};
  site: {name: string};
  _count: {lines: number};
};

function toSummary(order: SelectedOrder): OrderSummaryRecord {
  return {
    id: order.id,
    number: order.number,
    customerName: order.customer.name,
    siteName: order.site.name,
    status: order.status as OrderStatusName,
    requestedFor: order.requestedFor,
    totalAmount: order.totalAmount.toString(),
    currency: order.currency,
    lineCount: order._count.lines,
    createdAt: order.createdAt,
  };
}

async function recomputeTotal(
  tx: Prisma.TransactionClient,
  organizationId: string,
  orderId: string,
): Promise<void> {
  const lines = await tx.orderLine.findMany({
    where: {orderId, organizationId},
    select: {quantity: true, unitPrice: true},
  });

  const total = lines.reduce(
    (sum, line) => sum.plus(new Decimal(line.quantity.toString()).mul(line.unitPrice.toString())),
    new Decimal(0),
  );

  await tx.order.update({
    where: {id: orderId},
    data: {totalAmount: total.toDecimalPlaces(4, Decimal.ROUND_HALF_UP)},
  });
}

export const orderRepository: OrderRepository = {
  async list(organizationId, filters) {
    const where: Prisma.OrderWhereInput = {
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

    const [total, orders] = await prisma.$transaction([
      prisma.order.count({where}),
      prisma.order.findMany({
        where,
        orderBy: {createdAt: "desc"},
        skip: filters.skip,
        take: filters.take,
        select: orderSummarySelect,
      }),
    ]);

    return {orders: orders.map(toSummary), total};
  },

  async find(organizationId, id) {
    const order = await prisma.order.findFirst({
      where: {id, organizationId},
      select: {
        ...orderSummarySelect,
        customerId: true,
        siteId: true,
        note: true,
        lines: {
          orderBy: {createdAt: "asc"},
          select: {
            id: true,
            itemId: true,
            item: {select: {code: true, name: true}},
            quantity: true,
            unit: {select: {code: true}},
            unitPrice: true,
            fulfilledQuantity: true,
            note: true,
          },
        },
      },
    });

    if (!order) return null;

    const lines: OrderLineRecord[] = order.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemCode: line.item.code,
      itemName: line.item.name,
      quantity: line.quantity.toString(),
      unitCode: line.unit.code,
      unitPrice: line.unitPrice.toString(),
      fulfilledQuantity: line.fulfilledQuantity.toString(),
      note: line.note,
    }));

    return {
      ...toSummary(order),
      customerId: order.customerId,
      siteId: order.siteId,
      note: order.note,
      lines,
    };
  },

  async findSummary(organizationId, id) {
    return prisma.order.findFirst({
      where: {id, organizationId},
      select: {id: true, status: true, customerId: true},
    });
  },

  async create(organizationId, input) {
    return withTransaction(async (tx) => {
      const now = new Date();
      const prefix = receiptNumberPrefix(now).replace("GR", "ORD");
      const existing = await tx.order.findMany({
        where: {organizationId, number: {startsWith: prefix}},
        select: {number: true},
      });
      const sequence = nextDocumentSequence(
        existing.map((order) => order.number),
        prefix,
      );

      const order = await tx.order.create({
        data: {
          organizationId,
          ...input,
          number: `${prefix}-${String(sequence).padStart(3, "0")}`,
          status: "DRAFT",
        },
        select: {id: true},
      });

      return order.id;
    });
  },

  async addLine(organizationId, orderId, input) {
    await withTransaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {id: orderId, organizationId},
        select: {status: true},
      });
      if (!order) throw new DomainError("NOT_FOUND");
      if (order.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      await tx.orderLine.create({
        data: {organizationId, orderId, ...input},
      });
      await recomputeTotal(tx, organizationId, orderId);
    });
  },

  async removeLine(organizationId, orderId, lineId) {
    await withTransaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {id: orderId, organizationId},
        select: {status: true},
      });
      if (!order) throw new DomainError("NOT_FOUND");
      if (order.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const result = await tx.orderLine.deleteMany({
        where: {id: lineId, orderId, organizationId},
      });
      if (result.count === 0) throw new DomainError("NOT_FOUND");
      await recomputeTotal(tx, organizationId, orderId);
    });
  },

  async confirm(organizationId, id) {
    const result = await prisma.order.updateMany({
      where: {id, organizationId, status: "DRAFT"},
      data: {status: "CONFIRMED"},
    });
    if (result.count === 0) throw new DomainError("INVALID_STATE_TRANSITION");
  },

  async cancel(organizationId, id) {
    const result = await prisma.order.updateMany({
      where: {id, organizationId, status: {in: ["DRAFT", "CONFIRMED"]}},
      data: {status: "CANCELLED"},
    });
    if (result.count === 0) throw new DomainError("INVALID_STATE_TRANSITION");
  },
};
