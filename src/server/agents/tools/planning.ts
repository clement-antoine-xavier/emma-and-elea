import {z} from "zod";
import {planningService} from "@/server/services/container";
import {
  idSchema,
  planCreateSchema,
  planLineRefSchema,
  planLineSchema,
  planLineUpdateSchema,
} from "@/server/validators/api.schema";
import {assistantTool, emptyToNull, toDate} from "./shared";

export const planningTools = {
  board: assistantTool({
    name: "get_production_board",
    description:
      "Production planning board: demand from orders and forecasts per item, with the options needed to add lines.",
    parameters: z.object({
      siteId: z.string().trim().optional(),
      date: z.string().trim().optional(),
    }),
    execute: async (input, context) =>
      planningService.getBoard(context.actor, {
        siteId: input.siteId,
        date: input.date,
      }),
  }),

  get: assistantTool({
    name: "get_production_plan",
    description:
      "Read one production plan with its lines, quantities and confirm state.",
    parameters: idSchema,
    execute: async ({id}, context) =>
      planningService.getPlan(context.actor, id),
  }),

  create: assistantTool({
    name: "create_production_plan",
    description:
      "Create a production plan for a site and day, optionally seeding it from forecasts and open orders. Returns its id.",
    parameters: planCreateSchema,
    execute: async (input, context) =>
      planningService.createPlan(context.actor, {
        siteId: input.siteId,
        plannedFor: toDate(input.plannedFor)!,
        includeForecast: input.includeForecast,
        includeOrders: input.includeOrders,
        note: emptyToNull(input.note),
      }),
  }),

  addLine: assistantTool({
    name: "add_production_plan_line",
    description: "Add an item quantity to a draft production plan.",
    parameters: planLineSchema,
    execute: async ({planId, ...input}, context) =>
      planningService.addLine(context.actor, planId, {
        itemId: input.itemId,
        quantity: input.quantity,
        note: emptyToNull(input.note),
      }),
  }),

  updateLine: assistantTool({
    name: "update_production_plan_line",
    description: "Change the planned quantity of a plan line.",
    parameters: planLineUpdateSchema,
    execute: async ({planId, lineId, quantity}, context) =>
      planningService.updateLine(context.actor, planId, lineId, quantity),
  }),

  removeLine: assistantTool({
    name: "remove_production_plan_line",
    description: "Remove a line from a draft production plan.",
    parameters: planLineRefSchema,
    execute: async ({planId, lineId}, context) =>
      planningService.removeLine(context.actor, planId, lineId),
  }),

  confirm: assistantTool({
    name: "confirm_production_plan",
    description:
      "Confirm a plan so its lines can be turned into batches. This commits the plan.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      planningService.confirmPlan(context.actor, id),
  }),

  close: assistantTool({
    name: "close_production_plan",
    description: "Close a confirmed plan once its batches exist.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      planningService.closePlan(context.actor, id),
  }),

  cancel: assistantTool({
    name: "cancel_production_plan",
    description: "Cancel a plan that has not produced batches.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      planningService.cancelPlan(context.actor, id),
  }),

  createBatch: assistantTool({
    name: "create_batch_from_plan_line",
    description:
      "Turn one confirmed plan line into a production batch. Returns the new batch id.",
    parameters: z.object({lineId: z.string().trim().min(1)}),
    execute: async ({lineId}, context) =>
      planningService.createBatchFromLine(context.actor, lineId),
  }),
};
