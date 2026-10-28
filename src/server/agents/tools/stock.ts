import {z} from "zod";
import {stockCountService, stockService} from "@/server/services/container";
import {
  idSchema,
  stockCountCreateSchema,
  stockCountLinesSchema,
  stockLotFiltersSchema,
} from "@/server/validators/api.schema";
import {assistantTool, emptyToNull, toDate} from "./shared";

export const stockTools = {
  levels: assistantTool({
    name: "get_stock_levels",
    description:
      "Current stock on hand per item, including reorder alerts. Use it for availability questions.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      stockService.getLevels(context.actor),
  }),

  lots: assistantTool({
    name: "list_stock_lots",
    description:
      "List stock lots with expiry and remaining quantity, optionally filtered by search or excluding empty lots.",
    parameters: stockLotFiltersSchema,
    execute: async (input, context) =>
      stockService.getLots(context.actor, {
        search: input.search,
        includeEmpty: input.includeEmpty ? "true" : undefined,
        page: input.page?.toString(),
        pageSize: input.pageSize?.toString(),
      }),
  }),

  lot: assistantTool({
    name: "get_stock_lot",
    description: "Read one stock lot with its movements and traceability.",
    parameters: idSchema,
    execute: async ({id}, context) => stockService.getLot(context.actor, id),
  }),

  counts: assistantTool({
    name: "list_stock_counts",
    description:
      "List stock count campaigns with their site and status, plus the sites available for a new count.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      stockCountService.getCounts(context.actor),
  }),

  count: assistantTool({
    name: "get_stock_count",
    description:
      "Read one stock count with its lines, expected quantities and variances.",
    parameters: idSchema,
    execute: async ({id}, context) =>
      stockCountService.getCount(context.actor, id),
  }),

  createCount: assistantTool({
    name: "create_stock_count",
    description:
      "Open a stock count for a site. It captures expected quantities immediately. Returns its id.",
    parameters: stockCountCreateSchema,
    execute: async (input, context) =>
      stockCountService.createCount(context.actor, {
        siteId: input.siteId,
        countedAt: toDate(input.countedAt)!,
        note: emptyToNull(input.note),
      }),
  }),

  updateCountLines: assistantTool({
    name: "update_stock_count_lines",
    description:
      "Record counted quantities on an open stock count. Use the line ids returned by get_stock_count.",
    parameters: stockCountLinesSchema,
    execute: async ({countId, lines}, context) =>
      stockCountService.updateLines(context.actor, countId, lines),
  }),

  postCount: assistantTool({
    name: "post_stock_count",
    description:
      "Post an open stock count: writes adjustment movements for the variance. This cannot be undone.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      stockCountService.postCount(context.actor, id),
  }),

  cancelCount: assistantTool({
    name: "cancel_stock_count",
    description: "Cancel an open stock count without posting adjustments.",
    parameters: idSchema,
    execute: async ({id}, context) =>
      stockCountService.cancelCount(context.actor, id),
  }),
};
