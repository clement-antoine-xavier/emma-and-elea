import type {McpServer} from "@modelcontextprotocol/server";
import type {OrganizationActor} from "@/server/auth/types";
import {runTool} from "../result";
import {
  idSchema,
  receiptFiltersSchema,
  receiptLineRefSchema,
  receiptLineSchema,
  receiptSchema,
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

export function registerPurchasingTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "list_receipts",
    {
      description:
        "List purchase receipts with pagination and an optional status filter.",
      inputSchema: receiptFiltersSchema,
      scopeChallenge: readScope,
    },
    async (input) =>
      runTool(() =>
        deps.purchasing.getReceipts(actor, {
          ...pageFilters(input),
          status: input.status,
        }),
      ),
  );

  server.registerTool(
    "get_receipt",
    {
      description: "Read one purchase receipt with its lines and totals.",
      inputSchema: idSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.purchasing.getReceipt(actor, id)),
  );

  server.registerTool(
    "get_receipt_form_options",
    {
      description:
        "List the sites, suppliers, items and units needed to create a receipt.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.purchasing.getFormOptions(actor)),
  );

  server.registerTool(
    "create_receipt_draft",
    {
      description:
        "Create a draft purchase receipt for a site and supplier. Returns its id.",
      inputSchema: receiptSchema,
      scopeChallenge: writeScope,
    },
    async (input) =>
      runTool(() =>
        deps.purchasing.createDraft(actor, {
          siteId: input.siteId,
          supplierId: input.supplierId,
          supplierReference: emptyToNull(input.supplierReference),
          note: emptyToNull(input.note),
        }),
      ),
  );

  server.registerTool(
    "add_receipt_line",
    {
      description:
        "Add a line to a draft receipt. Posting the receipt creates the lots and stock movements.",
      inputSchema: receiptLineSchema,
      scopeChallenge: writeScope,
    },
    async ({receiptId, line}) =>
      runTool(() =>
        deps.purchasing.addLine(actor, receiptId, {
          itemId: line.itemId,
          quantity: line.quantity,
          unitId: line.unitId,
          unitPrice: line.unitPrice,
          lotNumber: emptyToNull(line.lotNumber),
          supplierLotNumber: emptyToNull(line.supplierLotNumber),
          expiresOn: line.expiresOn ? toDate(line.expiresOn) : null,
          bestBeforeOn: line.bestBeforeOn ? toDate(line.bestBeforeOn) : null,
        }),
      ),
  );

  server.registerTool(
    "remove_receipt_line",
    {
      description: "Remove a line from a draft receipt.",
      inputSchema: receiptLineRefSchema,
      scopeChallenge: writeScope,
    },
    async ({receiptId, lineId}) =>
      runTool(() => deps.purchasing.removeLine(actor, receiptId, lineId)),
  );

  server.registerTool(
    "post_receipt",
    {
      description:
        "Post a draft receipt: creates lots and inbound stock movements. This cannot be undone. Requires the api:execute scope.",
      inputSchema: idSchema,
      scopeChallenge: executeScope,
    },
    async ({id}) => runTool(() => deps.purchasing.postReceipt(actor, id)),
  );

  server.registerTool(
    "cancel_receipt",
    {
      description: "Cancel a draft receipt.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.purchasing.cancelReceipt(actor, id)),
  );
}
