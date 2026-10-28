import type {McpServer} from "@modelcontextprotocol/server";
import {z} from "zod";
import type {OrganizationActor} from "@/server/auth/types";
import {runTool} from "../result";
import {
  idSchema,
  productionBatchIdSchema,
  productionBatchInputSchema,
  productionCompleteSchema,
  wasteInputSchema,
} from "@/server/validators/api.schema";
import {
  emptyToNull,
  executeScope,
  readScope,
  toDate,
  writeScope,
  type McpDeps,
} from "./shared";

export function registerProductionTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "get_production_options",
    {
      description:
        "List the sites, recipe versions, equipment and rates needed to create a production batch.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.production.getOptions(actor)),
  );

  server.registerTool(
    "list_production_batches",
    {
      description:
        "List production batches with status, recipe and planned quantities.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.production.getBatches(actor)),
  );

  server.registerTool(
    "get_production_batch",
    {
      description:
        "Read one batch with its inputs, outputs, cost snapshot and traceability.",
      inputSchema: productionBatchIdSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.production.getBatch(actor, id)),
  );

  server.registerTool(
    "create_production_batch",
    {
      description:
        "Create a planned production batch for a recipe version and quantity. Returns its id.",
      inputSchema: productionBatchInputSchema,
      scopeChallenge: writeScope,
    },
    async (input) =>
      runTool(() =>
        deps.production.createBatch(actor, {
          siteId: input.siteId,
          recipeVersionId: input.recipeVersionId,
          plannedQuantity: input.plannedQuantity,
          plannedStartAt: input.plannedStartAt
            ? toDate(input.plannedStartAt)
            : null,
          note: emptyToNull(input.note),
        }),
      ),
  );

  server.registerTool(
    "start_production_batch",
    {
      description:
        "Start a planned batch: consumes its inputs from stock and moves it to in progress. Requires the api:execute scope.",
      inputSchema: productionBatchIdSchema,
      scopeChallenge: executeScope,
    },
    async ({id}) => runTool(() => deps.production.startBatch(actor, id)),
  );

  server.registerTool(
    "complete_production_batch",
    {
      description:
        "Complete a batch with its actual output quantity. Produces the output lot and cost snapshot. Requires the api:execute scope.",
      inputSchema: productionCompleteSchema,
      scopeChallenge: executeScope,
    },
    async ({id, ...input}) =>
      runTool(() =>
        deps.production.completeBatch(actor, id, {
          actualQuantity: input.actualQuantity,
          producedOn: input.producedOn ? toDate(input.producedOn) : null,
        }),
      ),
  );

  server.registerTool(
    "cancel_production_batch",
    {
      description: "Cancel a batch that has not been completed.",
      inputSchema: productionBatchIdSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.production.cancelBatch(actor, id)),
  );

  server.registerTool(
    "list_waste_records",
    {
      description: "List recorded waste with its lot, reason and quantity.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.production.getWaste(actor)),
  );

  server.registerTool(
    "get_waste_options",
    {
      description:
        "List the lots and loss reasons needed to record waste.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.production.getWasteOptions(actor)),
  );

  server.registerTool(
    "record_waste",
    {
      description:
        "Record a waste movement against a stock lot. Writes an outbound stock movement.",
      inputSchema: wasteInputSchema,
      scopeChallenge: writeScope,
    },
    async (input) =>
      runTool(() =>
        deps.production.recordWaste(actor, {
          lotId: input.lotId,
          lossReasonId: input.lossReasonId,
          quantity: input.quantity,
          reason: emptyToNull(input.reason),
          recordedAt: input.recordedAt ? toDate(input.recordedAt) : new Date(),
        }),
      ),
  );

  server.registerTool(
    "archive_waste",
    {
      description: "Archive a waste record.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.production.archiveWaste(actor, id)),
  );

  server.registerTool(
    "get_lot_trace",
    {
      description:
        "Full traceability for a stock lot: purchases, production, sales and waste, in ledger order.",
      inputSchema: z.object({lotId: z.string().trim().min(1)}),
      scopeChallenge: readScope,
    },
    async ({lotId}) => runTool(() => deps.production.getTrace(actor, lotId)),
  );
}
