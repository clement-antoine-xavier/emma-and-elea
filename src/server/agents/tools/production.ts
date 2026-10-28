import {z} from "zod";
import {productionService} from "@/server/services/container";
import {
  idSchema,
  productionBatchIdSchema,
  productionBatchInputSchema,
  productionCompleteSchema,
  wasteInputSchema,
} from "@/server/validators/api.schema";
import {assistantTool, emptyToNull, toDate} from "./shared";

export const productionTools = {
  options: assistantTool({
    name: "get_production_options",
    description:
      "List the sites, recipe versions, equipment and rates needed to create a production batch.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      productionService.getOptions(context.actor),
  }),

  list: assistantTool({
    name: "list_production_batches",
    description:
      "List production batches with status, recipe and planned quantities.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      productionService.getBatches(context.actor),
  }),

  get: assistantTool({
    name: "get_production_batch",
    description:
      "Read one batch with its inputs, outputs, cost snapshot and traceability.",
    parameters: productionBatchIdSchema,
    execute: async ({id}, context) =>
      productionService.getBatch(context.actor, id),
  }),

  create: assistantTool({
    name: "create_production_batch",
    description:
      "Create a planned production batch for a recipe version and quantity. Returns its id.",
    parameters: productionBatchInputSchema,
    execute: async (input, context) =>
      productionService.createBatch(context.actor, {
        siteId: input.siteId,
        recipeVersionId: input.recipeVersionId,
        plannedQuantity: input.plannedQuantity,
        plannedStartAt: toDate(input.plannedStartAt),
        note: emptyToNull(input.note),
      }),
  }),

  start: assistantTool({
    name: "start_production_batch",
    description:
      "Start a planned batch: consumes its inputs from stock and moves it to in progress.",
    parameters: productionBatchIdSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      productionService.startBatch(context.actor, id),
  }),

  complete: assistantTool({
    name: "complete_production_batch",
    description:
      "Complete a batch with its actual output quantity. Produces the output lot and cost snapshot.",
    parameters: productionCompleteSchema,
    needsApproval: true,
    execute: async ({id, ...input}, context) =>
      productionService.completeBatch(context.actor, id, {
        actualQuantity: input.actualQuantity,
        producedOn: toDate(input.producedOn),
      }),
  }),

  cancel: assistantTool({
    name: "cancel_production_batch",
    description: "Cancel a batch that has not been completed.",
    parameters: productionBatchIdSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      productionService.cancelBatch(context.actor, id),
  }),

  waste: assistantTool({
    name: "list_waste_records",
    description: "List recorded waste with its lot, reason and quantity.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      productionService.getWaste(context.actor),
  }),

  wasteOptions: assistantTool({
    name: "get_waste_options",
    description:
      "List the lots and loss reasons needed to record waste.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      productionService.getWasteOptions(context.actor),
  }),

  recordWaste: assistantTool({
    name: "record_waste",
    description:
      "Record a waste quantity against a lot and loss reason. It reduces stock.",
    parameters: wasteInputSchema,
    needsApproval: true,
    execute: async (input, context) =>
      productionService.recordWaste(context.actor, {
        lotId: input.lotId,
        lossReasonId: input.lossReasonId,
        quantity: input.quantity,
        reason: emptyToNull(input.reason),
        recordedAt: toDate(input.recordedAt) ?? new Date(),
      }),
  }),

  archiveWaste: assistantTool({
    name: "archive_waste",
    description: "Archive a waste record.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      productionService.archiveWaste(context.actor, id),
  }),

  trace: assistantTool({
    name: "get_lot_trace",
    description:
      "Trace a lot through production, inputs and dispatches for recall or inspection questions.",
    parameters: z.object({lotId: z.string().trim().min(1)}),
    execute: async ({lotId}, context) =>
      productionService.getTrace(context.actor, lotId),
  }),
};
