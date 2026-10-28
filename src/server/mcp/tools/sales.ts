import type {McpServer} from "@modelcontextprotocol/server";
import {z} from "zod";
import type {OrganizationActor} from "@/server/auth/types";
import {runTool} from "../result";
import {toCustomerInput} from "@/server/api/inputs";
import {
  customerSchema,
  customerUpdateSchema,
  dailySalesFiltersSchema,
  dailySalesSchema,
  idSchema,
  orderCreateSchema,
  orderLineRefSchema,
  orderLineSchema,
} from "@/server/validators/api.schema";
import {
  emptyToNull,
  pageFilters,
  readScope,
  toDate,
  writeScope,
  type McpDeps,
} from "./shared";

export function registerSalesTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "list_customers",
    {
      description: "List customers with their code, type and contact details.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.customer.getCustomers(actor)),
  );

  server.registerTool(
    "get_customer",
    {
      description: "Read one customer.",
      inputSchema: idSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.customer.getCustomer(actor, id)),
  );

  server.registerTool(
    "create_customer",
    {
      description: "Create a customer. Returns its id.",
      inputSchema: customerSchema,
      scopeChallenge: writeScope,
    },
    async (input) =>
      runTool(() => deps.customer.createCustomer(actor, toCustomerInput(input))),
  );

  server.registerTool(
    "update_customer",
    {
      description: "Replace an existing customer's fields.",
      inputSchema: customerUpdateSchema,
      scopeChallenge: writeScope,
    },
    async ({id, ...input}) =>
      runTool(() => deps.customer.updateCustomer(actor, id, toCustomerInput(input))),
  );

  server.registerTool(
    "archive_customer",
    {
      description: "Archive a customer. Existing orders keep referencing it.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.customer.archiveCustomer(actor, id)),
  );

  server.registerTool(
    "list_orders",
    {
      description: "List sales orders with pagination and an optional status filter.",
      inputSchema: z.object({
        search: z.string().trim().max(120).optional(),
        status: z.string().trim().optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      }),
      scopeChallenge: readScope,
    },
    async (input) =>
      runTool(() =>
        deps.order.getOrders(actor, {
          ...pageFilters(input),
          status: input.status,
        }),
      ),
  );

  server.registerTool(
    "get_order",
    {
      description: "Read one order with its lines, totals and status.",
      inputSchema: idSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.order.getOrder(actor, id)),
  );

  server.registerTool(
    "get_order_options",
    {
      description:
        "List the customers, sites, items and units needed to create an order.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.order.getOptions(actor)),
  );

  server.registerTool(
    "create_order",
    {
      description:
        "Create a draft order for a customer and site. Returns its id.",
      inputSchema: orderCreateSchema,
      scopeChallenge: writeScope,
    },
    async (input) =>
      runTool(() =>
        deps.order.createOrder(actor, {
          customerId: input.customerId,
          siteId: input.siteId,
          requestedFor: toDate(input.requestedFor),
          note: emptyToNull(input.note),
        }),
      ),
  );

  server.registerTool(
    "add_order_line",
    {
      description: "Add an item quantity and unit price to a draft order.",
      inputSchema: orderLineSchema,
      scopeChallenge: writeScope,
    },
    async ({orderId, line}) =>
      runTool(() =>
        deps.order.addLine(actor, orderId, {
          itemId: line.itemId,
          quantity: line.quantity,
          unitId: line.unitId,
          unitPrice: line.unitPrice,
          note: emptyToNull(line.note),
        }),
      ),
  );

  server.registerTool(
    "remove_order_line",
    {
      description: "Remove a line from a draft order.",
      inputSchema: orderLineRefSchema,
      scopeChallenge: writeScope,
    },
    async ({orderId, lineId}) =>
      runTool(() => deps.order.removeLine(actor, orderId, lineId)),
  );

  server.registerTool(
    "confirm_order",
    {
      description: "Confirm a draft order.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.order.confirmOrder(actor, id)),
  );

  server.registerTool(
    "cancel_order",
    {
      description: "Cancel an order that has not been dispatched.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.order.cancelOrder(actor, id)),
  );

  server.registerTool(
    "list_daily_sales",
    {
      description:
        "List recorded daily sales between two dates, with revenue per item and channel.",
      inputSchema: dailySalesFiltersSchema,
      scopeChallenge: readScope,
    },
    async (input) =>
      runTool(() =>
        deps.dailySales.getDailySales(actor, {
          from: input.from,
          to: input.to,
        }),
      ),
  );

  server.registerTool(
    "get_daily_sales_options",
    {
      description: "List the sites and items needed to record daily sales.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.dailySales.getOptions(actor)),
  );

  server.registerTool(
    "record_daily_sales",
    {
      description:
        "Record sold quantity and revenue for one item on a business day. Writes an outbound stock movement.",
      inputSchema: dailySalesSchema,
      scopeChallenge: writeScope,
    },
    async (input) =>
      runTool(() =>
        deps.dailySales.recordDailySales(actor, {
          siteId: input.siteId,
          itemId: input.itemId,
          businessDate: toDate(input.businessDate),
          channel: input.channel as "RETAIL" | "WHOLESALE" | "BOTH" | "NONE",
          quantitySold: input.quantitySold,
          revenue: input.revenue,
          note: emptyToNull(input.note),
        }),
      ),
  );
}
