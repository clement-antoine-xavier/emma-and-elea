import type {McpServer} from "@modelcontextprotocol/server";
import {z} from "zod";
import type {OrganizationActor} from "@/server/auth/types";
import {runTool} from "../result";
import {
  idSchema,
  planCreateSchema,
  planLineRefSchema,
  planLineSchema,
  planLineUpdateSchema,
} from "@/server/validators/api.schema";
import {emptyToNull, readScope, toDate, writeScope, type McpDeps} from "./shared";

export function registerPlanningTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "get_production_board",
    {
      description:
        "Production planning board: demand from orders and forecasts per item, with the options needed to add lines.",
      inputSchema: z.object({
        siteId: z.string().trim().optional(),
        date: z.string().trim().optional(),
      }),
      scopeChallenge: readScope,
    },
    async (input) =>
      runTool(() =>
        deps.planning.getBoard(actor, {
          siteId: input.siteId,
          date: input.date,
        }),
      ),
  );

  server.registerTool(
    "get_production_plan",
    {
      description:
        "Read one production plan with its lines, quantities and confirm state.",
      inputSchema: idSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.planning.getPlan(actor, id)),
  );

  server.registerTool(
    "create_production_plan",
    {
      description:
        "Create a production plan for a site and day, optionally seeding it from forecasts and open orders. Returns its id.",
      inputSchema: planCreateSchema,
      scopeChallenge: writeScope,
    },
    async (input) =>
      runTool(() =>
        deps.planning.createPlan(actor, {
          siteId: input.siteId,
          plannedFor: toDate(input.plannedFor),
          includeForecast: input.includeForecast,
          includeOrders: input.includeOrders,
          note: emptyToNull(input.note),
        }),
      ),
  );

  server.registerTool(
    "add_production_plan_line",
    {
      description: "Add an item quantity to a draft production plan.",
      inputSchema: planLineSchema,
      scopeChallenge: writeScope,
    },
    async ({planId, ...input}) =>
      runTool(() =>
        deps.planning.addLine(actor, planId, {
          itemId: input.itemId,
          quantity: input.quantity,
          note: emptyToNull(input.note),
        }),
      ),
  );

  server.registerTool(
    "update_production_plan_line",
    {
      description: "Change the planned quantity of a plan line.",
      inputSchema: planLineUpdateSchema,
      scopeChallenge: writeScope,
    },
    async ({planId, lineId, quantity}) =>
      runTool(() =>
        deps.planning.updateLine(actor, planId, lineId, quantity),
      ),
  );

  server.registerTool(
    "remove_production_plan_line",
    {
      description: "Remove a line from a draft production plan.",
      inputSchema: planLineRefSchema,
      scopeChallenge: writeScope,
    },
    async ({planId, lineId}) =>
      runTool(() => deps.planning.removeLine(actor, planId, lineId)),
  );

  server.registerTool(
    "confirm_production_plan",
    {
      description: "Confirm a plan so its lines can be turned into batches.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.planning.confirmPlan(actor, id)),
  );

  server.registerTool(
    "close_production_plan",
    {
      description: "Close a confirmed plan once its batches exist.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.planning.closePlan(actor, id)),
  );

  server.registerTool(
    "cancel_production_plan",
    {
      description: "Cancel a plan that has not produced batches.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.planning.cancelPlan(actor, id)),
  );

  server.registerTool(
    "create_batch_from_plan_line",
    {
      description:
        "Turn one confirmed plan line into a production batch. Returns the new batch id.",
      inputSchema: z.object({lineId: z.string().trim().min(1)}),
      scopeChallenge: writeScope,
    },
    async ({lineId}) =>
      runTool(() => deps.planning.createBatchFromLine(actor, lineId)),
  );
}
