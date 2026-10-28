import {z} from "zod";
import {supplierService} from "@/server/services/container";
import {
  idSchema,
  supplierSchema,
  supplierUpdateSchema,
} from "@/server/validators/api.schema";
import {assistantTool, emptyToNull} from "./shared";

function toSupplierInput(input: {
  code: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  defaultLeadTimeDays: string;
  note: string;
}) {
  return {
    code: input.code,
    name: input.name,
    contactName: emptyToNull(input.contactName),
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    city: emptyToNull(input.city),
    defaultLeadTimeDays:
      input.defaultLeadTimeDays === ""
        ? null
        : Number(input.defaultLeadTimeDays),
    note: emptyToNull(input.note),
  };
}

export const supplierTools = {
  list: assistantTool({
    name: "list_suppliers",
    description:
      "List suppliers with their contact details and lead time.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      supplierService.getSuppliers(context.actor),
  }),

  get: assistantTool({
    name: "get_supplier",
    description:
      "Read one supplier with its item prices and delivery information.",
    parameters: idSchema,
    execute: async ({id}, context) =>
      supplierService.getSupplier(context.actor, id),
  }),

  options: assistantTool({
    name: "get_supplier_form_options",
    description:
      "List the items and units needed to add a supplier price.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      supplierService.getFormOptions(context.actor),
  }),

  create: assistantTool({
    name: "create_supplier",
    description: "Create a supplier. Returns its id.",
    parameters: supplierSchema,
    execute: async (input, context) =>
      supplierService.createSupplier(context.actor, toSupplierInput(input)),
  }),

  update: assistantTool({
    name: "update_supplier",
    description:
      "Replace a supplier's fields. Read it first and send every field back.",
    parameters: supplierUpdateSchema,
    execute: async ({id, ...input}, context) =>
      supplierService.updateSupplier(
        context.actor,
        id,
        toSupplierInput(input),
      ),
  }),

  archive: assistantTool({
    name: "archive_supplier",
    description: "Archive a supplier. History is kept.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      supplierService.archiveSupplier(context.actor, id),
  }),
};
