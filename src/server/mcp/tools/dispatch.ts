import type {McpServer} from "@modelcontextprotocol/server";
import {z} from "zod";
import type {OrganizationActor} from "@/server/auth/types";
import {runTool} from "../result";
import {
  dispatchCreateSchema,
  dispatchLineRefSchema,
  dispatchLineSchema,
  idSchema,
} from "@/server/validators/api.schema";
import {
  emptyToNull,
  executeScope,
  pageFilters,
  readScope,
  writeScope,
  type McpDeps,
} from "./shared";

export function registerDispatchTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "list_dispatches",
    {
      description:
        "List dispatches with pagination and an optional status filter.",
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
        deps.dispatch.getDispatches(actor, {
          ...pageFilters(input),
          status: input.status,
        }),
      ),
  );

  server.registerTool(
    "get_dispatch",
    {
      description: "Read one dispatch with its lots, quantities and status.",
      inputSchema: idSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.dispatch.getDispatch(actor, id)),
  );

  server.registerTool(
    "get_dispatch_options",
    {
      description:
        "List the sites, customers, orders, lots and units needed to build a dispatch.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.dispatch.getOptions(actor)),
  );

  server.registerTool(
    "create_dispatch",
    {
      description:
        "Create a draft dispatch for a site, optionally linked to a customer and order. Returns its id.",
      inputSchema: dispatchCreateSchema,
      scopeChallenge: writeScope,
    },
    async (input) =>
      runTool(() =>
        deps.dispatch.createDispatch(actor, {
          siteId: input.siteId,
          customerId: emptyToNull(input.customerId),
          orderId: emptyToNull(input.orderId),
          carrier: emptyToNull(input.carrier),
          note: emptyToNull(input.note),
        }),
      ),
  );

  server.registerTool(
    "add_dispatch_line",
    {
      description: "Add a stock lot, quantity and unit price to a draft dispatch.",
      inputSchema: dispatchLineSchema,
      scopeChallenge: writeScope,
    },
    async ({dispatchId, line}) =>
      runTool(() =>
        deps.dispatch.addLine(actor, dispatchId, {
          lotId: line.lotId,
          quantity: line.quantity,
          unitPrice: emptyToNull(line.unitPrice),
          note: emptyToNull(line.note),
        }),
      ),
  );

  server.registerTool(
    "remove_dispatch_line",
    {
      description: "Remove a line from a draft dispatch.",
      inputSchema: dispatchLineRefSchema,
      scopeChallenge: writeScope,
    },
    async ({dispatchId, lineId}) =>
      runTool(() => deps.dispatch.removeLine(actor, dispatchId, lineId)),
  );

  server.registerTool(
    "post_dispatch",
    {
      description:
        "Post a draft dispatch: moves stock out and records the sale. This cannot be undone. Requires the api:execute scope.",
      inputSchema: idSchema,
      scopeChallenge: executeScope,
    },
    async ({id}) => runTool(() => deps.dispatch.postDispatch(actor, id)),
  );

  server.registerTool(
    "cancel_dispatch",
    {
      description: "Cancel a dispatch that has not been posted.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.dispatch.cancelDispatch(actor, id)),
  );
}
