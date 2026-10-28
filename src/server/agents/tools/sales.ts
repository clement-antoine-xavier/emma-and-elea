import {z} from "zod";
import {toCustomerInput} from "@/server/api/inputs";
import {
  customerService,
  dailySalesService,
  dispatchService,
  orderService,
} from "@/server/services/container";
import {
  customerSchema,
  customerUpdateSchema,
  dailySalesFiltersSchema,
  dailySalesSchema,
  dispatchCreateSchema,
  dispatchLineRefSchema,
  dispatchLineSchema,
  idSchema,
  orderCreateSchema,
  orderLineRefSchema,
  orderLineSchema,
} from "@/server/validators/api.schema";
import {assistantTool, emptyToNull, toDate} from "./shared";

export const customerTools = {
  list: assistantTool({
    name: "list_customers",
    description:
      "List customers with their code, type and contact details. Use it before creating an order.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      customerService.getCustomers(context.actor),
  }),

  get: assistantTool({
    name: "get_customer",
    description: "Read one customer.",
    parameters: idSchema,
    execute: async ({id}, context) =>
      customerService.getCustomer(context.actor, id),
  }),

  create: assistantTool({
    name: "create_customer",
    description: "Create a customer. Returns its id.",
    parameters: customerSchema,
    execute: async (input, context) =>
      customerService.createCustomer(context.actor, toCustomerInput(input)),
  }),

  update: assistantTool({
    name: "update_customer",
    description:
      "Replace a customer's fields. Read it first and send every field back.",
    parameters: customerUpdateSchema,
    execute: async ({id, ...input}, context) =>
      customerService.updateCustomer(
        context.actor,
        id,
        toCustomerInput(input),
      ),
  }),

  archive: assistantTool({
    name: "archive_customer",
    description:
      "Archive a customer. Existing orders keep referencing it.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      customerService.archiveCustomer(context.actor, id),
  }),
};

export const orderTools = {
  list: assistantTool({
    name: "list_orders",
    description:
      "List sales orders with pagination and an optional status filter. Use status READY or CONFIRMED to find deliveries to prepare.",
    parameters: z.object({
      search: z.string().trim().max(120).optional(),
      status: z.string().trim().optional(),
      page: z.number().int().min(1).optional(),
      pageSize: z.number().int().min(1).max(50).optional(),
    }),
    execute: async (input, context) =>
      orderService.getOrders(context.actor, {
        search: input.search,
        status: input.status,
        page: input.page?.toString(),
        pageSize: input.pageSize?.toString(),
      }),
  }),

  get: assistantTool({
    name: "get_order",
    description: "Read one order with its lines, totals and status.",
    parameters: idSchema,
    execute: async ({id}, context) =>
      orderService.getOrder(context.actor, id),
  }),

  options: assistantTool({
    name: "get_order_options",
    description:
      "List the customers, sites, items and units needed to create an order.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      orderService.getOptions(context.actor),
  }),

  create: assistantTool({
    name: "create_order",
    description:
      "Create a draft order for a customer and site. Returns its id. Ask for any missing customer, site or date instead of guessing.",
    parameters: orderCreateSchema,
    execute: async (input, context) =>
      orderService.createOrder(context.actor, {
        customerId: input.customerId,
        siteId: input.siteId,
        requestedFor: toDate(input.requestedFor)!,
        note: emptyToNull(input.note),
      }),
  }),

  addLine: assistantTool({
    name: "add_order_line",
    description:
      "Add an item quantity and unit price to a draft order.",
    parameters: orderLineSchema,
    execute: async ({orderId, line}, context) =>
      orderService.addLine(context.actor, orderId, {
        itemId: line.itemId,
        quantity: line.quantity,
        unitId: line.unitId,
        unitPrice: line.unitPrice,
        note: emptyToNull(line.note),
      }),
  }),

  removeLine: assistantTool({
    name: "remove_order_line",
    description: "Remove a line from a draft order.",
    parameters: orderLineRefSchema,
    execute: async ({orderId, lineId}, context) =>
      orderService.removeLine(context.actor, orderId, lineId),
  }),

  confirm: assistantTool({
    name: "confirm_order",
    description:
      "Confirm a draft order. This commits it to production and delivery planning.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      orderService.confirmOrder(context.actor, id),
  }),

  cancel: assistantTool({
    name: "cancel_order",
    description: "Cancel an order that has not been dispatched.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      orderService.cancelOrder(context.actor, id),
  }),
};

export const dispatchTools = {
  list: assistantTool({
    name: "list_dispatches",
    description: "List deliveries with their status and customer.",
    parameters: z.object({
      search: z.string().trim().max(120).optional(),
      status: z.string().trim().optional(),
      page: z.number().int().min(1).optional(),
      pageSize: z.number().int().min(1).max(50).optional(),
    }),
    execute: async (input, context) =>
      dispatchService.getDispatches(context.actor, {
        search: input.search,
        status: input.status,
        page: input.page?.toString(),
        pageSize: input.pageSize?.toString(),
      }),
  }),

  get: assistantTool({
    name: "get_dispatch",
    description: "Read one delivery with its lines and lots.",
    parameters: idSchema,
    execute: async ({id}, context) =>
      dispatchService.getDispatch(context.actor, id),
  }),

  options: assistantTool({
    name: "get_dispatch_options",
    description:
      "List the sites, customers, orders and available lots needed to create a delivery.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      dispatchService.getOptions(context.actor),
  }),

  create: assistantTool({
    name: "create_dispatch",
    description:
      "Create a draft delivery for a site, optionally linked to an order. Returns its id.",
    parameters: dispatchCreateSchema,
    execute: async (input, context) =>
      dispatchService.createDispatch(context.actor, {
        siteId: input.siteId,
        customerId: emptyToNull(input.customerId),
        orderId: emptyToNull(input.orderId),
        carrier: emptyToNull(input.carrier),
        note: emptyToNull(input.note),
      }),
  }),

  addLine: assistantTool({
    name: "add_dispatch_line",
    description:
      "Add a lot and quantity to a draft delivery. Use the lots returned by get_dispatch_options; never invent a lot id.",
    parameters: dispatchLineSchema,
    execute: async ({dispatchId, line}, context) =>
      dispatchService.addLine(context.actor, dispatchId, {
        lotId: line.lotId,
        quantity: line.quantity,
        unitPrice: emptyToNull(line.unitPrice),
        note: emptyToNull(line.note),
      }),
  }),

  removeLine: assistantTool({
    name: "remove_dispatch_line",
    description: "Remove a line from a draft delivery.",
    parameters: dispatchLineRefSchema,
    execute: async ({dispatchId, lineId}, context) =>
      dispatchService.removeLine(context.actor, dispatchId, lineId),
  }),

  post: assistantTool({
    name: "post_dispatch",
    description:
      "Post a draft delivery: writes the outbound stock movements and marks it dispatched.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      dispatchService.postDispatch(context.actor, id),
  }),

  cancel: assistantTool({
    name: "cancel_dispatch",
    description: "Cancel a delivery that has not been posted.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      dispatchService.cancelDispatch(context.actor, id),
  }),
};

export const dailySalesTools = {
  summary: assistantTool({
    name: "get_sales_summary",
    description:
      "Revenue-only summary for a period: total revenue, quantity and revenue by item, plus order counts by status. Never includes costs or margins.",
    parameters: z.object({
      from: z.string().trim().optional(),
      to: z.string().trim().optional(),
      siteId: z.string().trim().optional(),
    }),
    execute: async (input, context) => {
      const [sales, orders] = await Promise.all([
        dailySalesService.getDailySales(context.actor, {
          from: input.from,
          to: input.to,
          siteId: input.siteId,
        }),
        orderService.getOrders(context.actor, {pageSize: "50"}),
      ]);

      const byItem = new Map<
        string,
        {itemId: string; itemName: string; quantity: number; revenue: number}
      >();

      for (const row of sales.rows) {
        const current = byItem.get(row.itemId) ?? {
          itemId: row.itemId,
          itemName: row.itemName,
          quantity: 0,
          revenue: 0,
        };
        current.quantity += Number(row.quantitySold);
        current.revenue += Number(row.revenue);
        byItem.set(row.itemId, current);
      }

      const statuses: Record<string, number> = {};
      for (const order of orders.page.items) {
        statuses[order.status] = (statuses[order.status] ?? 0) + 1;
      }

      return {
        from: sales.from,
        to: sales.to,
        currency: sales.rows[0]?.currency ?? null,
        revenue: [...byItem.values()].reduce(
          (total, item) => total + item.revenue,
          0,
        ),
        items: [...byItem.values()]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 15),
        orderStatuses: statuses,
        orderCount: orders.page.total,
      };
    },
  }),

  list: assistantTool({
    name: "list_daily_sales",
    description:
      "List recorded daily sales between two dates, optionally for one site.",
    parameters: dailySalesFiltersSchema,
    execute: async (input, context) =>
      dailySalesService.getDailySales(context.actor, {
        from: input.from,
        to: input.to,
        siteId: input.siteId,
      }),
  }),

  options: assistantTool({
    name: "get_daily_sales_options",
    description: "List the sites and items needed to record daily sales.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      dailySalesService.getOptions(context.actor),
  }),

  record: assistantTool({
    name: "record_daily_sales",
    description:
      "Record sold quantity and revenue for one item on a business day. Echo the values back after recording.",
    parameters: dailySalesSchema,
    execute: async (input, context) =>
      dailySalesService.recordDailySales(context.actor, {
        siteId: input.siteId,
        itemId: input.itemId,
        businessDate: toDate(input.businessDate)!,
        channel: input.channel as "RETAIL" | "WHOLESALE" | "BOTH" | "NONE",
        quantitySold: input.quantitySold,
        revenue: input.revenue,
        note: emptyToNull(input.note),
      }),
  }),
};
