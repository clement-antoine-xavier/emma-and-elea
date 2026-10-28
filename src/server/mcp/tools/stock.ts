import type {McpServer} from "@modelcontextprotocol/server";
import type {OrganizationActor} from "@/server/auth/types";
import {runTool} from "../result";
import {
  idSchema,
  stockCountCreateSchema,
  stockCountLinesSchema,
  stockLotFiltersSchema,
} from "@/server/validators/api.schema";
import {
  emptyToNull,
  executeScope,
  pageFilters,
  readScope,
  toDate,
  writeScope,
  type McpDeps,
} from "./shared";

export function registerStockTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "get_stock_levels",
    {
      description:
        "Current stock on hand per item with the reorder alerts the dashboard uses.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.stock.getLevels(actor)),
  );

  server.registerTool(
    "list_stock_lots",
    {
      description:
        "List stock lots with expiry and remaining quantity, optionally filtered by search or excluding empty lots.",
      inputSchema: stockLotFiltersSchema,
      scopeChallenge: readScope,
    },
    async (input) =>
      runTool(() =>
        deps.stock.getLots(actor, {
          ...pageFilters(input),
          includeEmpty: input.includeEmpty ? "true" : undefined,
        }),
      ),
  );

  server.registerTool(
    "get_stock_lot",
    {
      description: "Read one stock lot with its movements and traceability.",
      inputSchema: idSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.stock.getLot(actor, id)),
  );

  server.registerTool(
    "list_stock_counts",
    {
      description:
        "List stock count campaigns with their site and status, plus the sites available for a new count.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.stockCount.getCounts(actor)),
  );

  server.registerTool(
    "get_stock_count",
    {
      description:
        "Read one stock count with its lines, expected quantities and variances.",
      inputSchema: idSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.stockCount.getCount(actor, id)),
  );

  server.registerTool(
    "create_stock_count",
    {
      description:
        "Open a stock count for a site. It captures the expected quantities immediately. Returns its id.",
      inputSchema: stockCountCreateSchema,
      scopeChallenge: executeScope,
    },
    async (input) =>
      runTool(() =>
        deps.stockCount.createCount(actor, {
          siteId: input.siteId,
          countedAt: toDate(input.countedAt),
          note: emptyToNull(input.note),
        }),
      ),
  );

  server.registerTool(
    "update_stock_count_lines",
    {
      description:
        "Record counted quantities on an open stock count. Use the line ids returned by get_stock_count.",
      inputSchema: stockCountLinesSchema,
      scopeChallenge: executeScope,
    },
    async ({countId, lines}) =>
      runTool(() => deps.stockCount.updateLines(actor, countId, lines)),
  );

  server.registerTool(
    "post_stock_count",
    {
      description:
        "Post an open stock count: writes adjustment movements for the variance. This cannot be undone. Requires the api:execute scope.",
      inputSchema: idSchema,
      scopeChallenge: executeScope,
    },
    async ({id}) => runTool(() => deps.stockCount.postCount(actor, id)),
  );

  server.registerTool(
    "cancel_stock_count",
    {
      description: "Cancel an open stock count without posting adjustments.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.stockCount.cancelCount(actor, id)),
  );
}
