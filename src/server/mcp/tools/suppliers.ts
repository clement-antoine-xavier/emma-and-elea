import type {McpServer} from "@modelcontextprotocol/server";
import type {OrganizationActor} from "@/server/auth/types";
import {runTool} from "../result";
import {
  idSchema,
  supplierSchema,
  supplierUpdateSchema,
} from "@/server/validators/api.schema";
import {emptyToNull, readScope, writeScope, type McpDeps} from "./shared";

function toInput(input: {
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
      input.defaultLeadTimeDays === "" ? null : Number(input.defaultLeadTimeDays),
    note: emptyToNull(input.note),
  };
}

export function registerSupplierTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "list_suppliers",
    {
      description: "List suppliers with their codes and contact details.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.supplier.getSuppliers(actor)),
  );

  server.registerTool(
    "get_supplier",
    {
      description: "Read one supplier and its priced items.",
      inputSchema: idSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.supplier.getSupplier(actor, id)),
  );

  server.registerTool(
    "get_supplier_form_options",
    {
      description:
        "List the items, units and suppliers needed to create purchase documents.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.supplier.getFormOptions(actor)),
  );

  server.registerTool(
    "create_supplier",
    {
      description: "Create a supplier. Returns its id.",
      inputSchema: supplierSchema,
      scopeChallenge: writeScope,
    },
    async (input) =>
      runTool(() => deps.supplier.createSupplier(actor, toInput(input))),
  );

  server.registerTool(
    "update_supplier",
    {
      description: "Replace an existing supplier's fields.",
      inputSchema: supplierUpdateSchema,
      scopeChallenge: writeScope,
    },
    async ({id, ...input}) =>
      runTool(() => deps.supplier.updateSupplier(actor, id, toInput(input))),
  );

  server.registerTool(
    "archive_supplier",
    {
      description: "Archive a supplier. Existing receipts keep referencing it.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.supplier.archiveSupplier(actor, id)),
  );
}
