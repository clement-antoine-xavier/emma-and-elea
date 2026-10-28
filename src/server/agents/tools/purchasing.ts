import {z} from "zod";
import {purchasingService} from "@/server/services/container";
import {
  idSchema,
  receiptFiltersSchema,
  receiptLineRefSchema,
  receiptLineSchema,
  receiptSchema,
} from "@/server/validators/api.schema";
import {assistantTool, emptyToNull, toDate} from "./shared";

export const purchasingTools = {
  list: assistantTool({
    name: "list_receipts",
    description:
      "List goods receipts with supplier, site, status and total. Use DRAFT to find a receipt to complete.",
    parameters: receiptFiltersSchema,
    execute: async (input, context) =>
      purchasingService.getReceipts(context.actor, {
        search: input.search,
        status: input.status,
        page: input.page?.toString(),
        pageSize: input.pageSize?.toString(),
      }),
  }),

  get: assistantTool({
    name: "get_receipt",
    description: "Read one goods receipt with its lines and lots.",
    parameters: idSchema,
    execute: async ({id}, context) =>
      purchasingService.getReceipt(context.actor, id),
  }),

  options: assistantTool({
    name: "get_receipt_form_options",
    description:
      "List the suppliers, sites, items and units needed to create a receipt.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      purchasingService.getFormOptions(context.actor),
  }),

  createDraft: assistantTool({
    name: "create_receipt_draft",
    description:
      "Create a draft goods receipt for a supplier and site. Returns its id.",
    parameters: receiptSchema,
    execute: async (input, context) =>
      purchasingService.createDraft(context.actor, {
        siteId: input.siteId,
        supplierId: input.supplierId,
        supplierReference: emptyToNull(input.supplierReference),
        note: emptyToNull(input.note),
      }),
  }),

  addLine: assistantTool({
    name: "add_receipt_line",
    description:
      "Add an item, quantity, unit price and optional lot/expiry to a draft receipt.",
    parameters: receiptLineSchema,
    execute: async ({receiptId, line}, context) =>
      purchasingService.addLine(context.actor, receiptId, {
        itemId: line.itemId,
        quantity: line.quantity,
        unitId: line.unitId,
        unitPrice: line.unitPrice,
        lotNumber: emptyToNull(line.lotNumber),
        supplierLotNumber: emptyToNull(line.supplierLotNumber),
        expiresOn: toDate(line.expiresOn),
        bestBeforeOn: toDate(line.bestBeforeOn),
      }),
  }),

  removeLine: assistantTool({
    name: "remove_receipt_line",
    description: "Remove a line from a draft receipt.",
    parameters: receiptLineRefSchema,
    execute: async ({receiptId, lineId}, context) =>
      purchasingService.removeLine(context.actor, receiptId, lineId),
  }),

  post: assistantTool({
    name: "post_receipt",
    description:
      "Post a draft receipt: creates its lots and stock movements. This cannot be undone.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      purchasingService.postReceipt(context.actor, id),
  }),

  cancel: assistantTool({
    name: "cancel_receipt",
    description: "Cancel a receipt that has not been posted.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      purchasingService.cancelReceipt(context.actor, id),
  }),
};
