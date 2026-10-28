import type {Permission} from "@/lib/permissions";
import type {AssistantPersona} from "../context";

/**
 * Pure capability metadata: no service or tool imports. Tests and documentation
 * can reason about who sees what without loading the auth container.
 */
export type CapabilityDefinition = {
  id: string;
  persona: AssistantPersona | "both";
  /** Every permission must be held; services still assert at call time. */
  requires: readonly Permission[];
  /** Tool names, in the order they are offered to the model. */
  tools: readonly string[];
};

export const CAPABILITY_DEFINITIONS: readonly CapabilityDefinition[] = [
  {
    id: "account",
    persona: "both",
    requires: ["organization:read"],
    tools: ["whoami", "list_sites", "get_daily_briefing"],
  },
  {
    id: "catalog-read",
    persona: "both",
    requires: ["catalog:read"],
    tools: ["list_catalog_items", "get_catalog_item", "list_categories"],
  },
  {
    id: "catalog-write",
    persona: "both",
    requires: ["catalog:write"],
    tools: [
      "create_catalog_item",
      "update_catalog_item",
      "archive_catalog_item",
      "archive_category",
    ],
  },
  {
    id: "customers-read",
    persona: "emma",
    requires: ["customer:read"],
    tools: ["list_customers", "get_customer"],
  },
  {
    id: "customers-write",
    persona: "emma",
    requires: ["customer:write"],
    tools: ["create_customer", "update_customer", "archive_customer"],
  },
  {
    id: "orders-read",
    persona: "emma",
    requires: ["order:read"],
    tools: ["list_orders", "get_order", "get_order_options"],
  },
  {
    id: "orders-write",
    persona: "emma",
    requires: ["order:write"],
    tools: [
      "create_order",
      "add_order_line",
      "remove_order_line",
      "confirm_order",
      "cancel_order",
    ],
  },
  {
    id: "dispatch-read",
    persona: "emma",
    requires: ["dispatch:read"],
    tools: ["list_dispatches", "get_dispatch", "get_dispatch_options"],
  },
  {
    id: "dispatch-write",
    persona: "emma",
    requires: ["dispatch:write"],
    tools: [
      "create_dispatch",
      "add_dispatch_line",
      "remove_dispatch_line",
      "post_dispatch",
      "cancel_dispatch",
    ],
  },
  {
    id: "daily-sales-read",
    persona: "emma",
    requires: ["sales:read"],
    tools: ["get_sales_summary", "list_daily_sales", "get_daily_sales_options"],
  },
  {
    id: "daily-sales-write",
    persona: "emma",
    requires: ["sales:write"],
    tools: ["record_daily_sales"],
  },
  {
    id: "production-read",
    persona: "elea",
    requires: ["production:read"],
    tools: [
      "get_production_options",
      "list_production_batches",
      "get_production_batch",
      "list_waste_records",
      "get_waste_options",
    ],
  },
  {
    id: "production-write",
    persona: "elea",
    requires: ["production:write"],
    tools: ["create_production_batch", "cancel_production_batch"],
  },
  {
    id: "production-execute",
    persona: "elea",
    requires: ["production:execute"],
    tools: ["start_production_batch", "complete_production_batch"],
  },
  {
    id: "waste-write",
    persona: "elea",
    requires: ["waste:write"],
    tools: ["record_waste", "archive_waste"],
  },
  {
    id: "traceability",
    persona: "elea",
    requires: ["stock:read"],
    tools: ["get_lot_trace"],
  },
  {
    id: "planning-read",
    persona: "elea",
    requires: ["production:read"],
    tools: ["get_production_board", "get_production_plan"],
  },
  {
    id: "planning-write",
    persona: "elea",
    requires: ["production:write"],
    tools: [
      "create_production_plan",
      "add_production_plan_line",
      "update_production_plan_line",
      "remove_production_plan_line",
      "confirm_production_plan",
      "close_production_plan",
      "cancel_production_plan",
      "create_batch_from_plan_line",
    ],
  },
  {
    id: "stock-read",
    persona: "elea",
    requires: ["stock:read"],
    tools: [
      "get_stock_levels",
      "list_stock_lots",
      "get_stock_lot",
      "list_stock_counts",
      "get_stock_count",
    ],
  },
  {
    id: "stock-count",
    persona: "elea",
    requires: ["stock:count"],
    tools: ["create_stock_count", "update_stock_count_lines"],
  },
  {
    id: "stock-write",
    persona: "elea",
    requires: ["stock:write"],
    tools: ["post_stock_count", "cancel_stock_count"],
  },
  {
    id: "purchasing-read",
    persona: "elea",
    requires: ["purchasing:read"],
    tools: ["list_receipts", "get_receipt", "get_receipt_form_options"],
  },
  {
    id: "purchasing-write",
    persona: "elea",
    requires: ["purchasing:write"],
    tools: [
      "create_receipt_draft",
      "add_receipt_line",
      "remove_receipt_line",
      "post_receipt",
      "cancel_receipt",
    ],
  },
  {
    id: "suppliers-read",
    persona: "elea",
    requires: ["supplier:read"],
    tools: [
      "list_suppliers",
      "get_supplier",
      "get_supplier_form_options",
    ],
  },
  {
    id: "suppliers-write",
    persona: "elea",
    requires: ["supplier:write"],
    tools: ["create_supplier", "update_supplier", "archive_supplier"],
  },
  {
    id: "recipes-read",
    persona: "elea",
    requires: ["recipe:read"],
    tools: ["list_recipes", "get_recipe", "get_recipe_options"],
  },
  {
    id: "recipes-write",
    persona: "elea",
    requires: ["recipe:write"],
    tools: [
      "create_recipe",
      "create_recipe_version",
      "update_recipe_version",
      "add_recipe_line",
      "remove_recipe_line",
      "add_recipe_operation",
      "remove_recipe_operation",
      "archive_recipe",
    ],
  },
  {
    id: "recipes-publish",
    persona: "elea",
    requires: ["recipe:publish"],
    tools: ["publish_recipe_version"],
  },
  {
    id: "reports-finance",
    persona: "elea",
    requires: ["report:finance"],
    tools: ["get_reports", "get_dashboard_kpis", "get_dashboard_overview"],
  },
  {
    id: "team-read",
    persona: "elea",
    requires: ["member:read"],
    tools: ["get_team"],
  },
  {
    id: "schedule-read",
    persona: "elea",
    requires: ["team:read"],
    tools: ["get_employees", "get_schedule"],
  },
  {
    id: "absences-read",
    persona: "elea",
    requires: ["absence:read"],
    tools: ["get_absences"],
  },
  {
    id: "absences-request",
    persona: "elea",
    requires: ["absence:request"],
    tools: ["create_absence"],
  },
  {
    id: "absences-decide",
    persona: "elea",
    requires: ["absence:decide"],
    tools: ["decide_absence"],
  },
  {
    id: "schedule-write",
    persona: "elea",
    requires: ["team:write"],
    tools: ["create_shift", "assign_shift"],
  },
  {
    id: "settings-read",
    persona: "elea",
    requires: ["organization:read"],
    tools: ["get_settings"],
  },
  {
    id: "equipment-read",
    persona: "elea",
    requires: ["equipment:read"],
    tools: ["get_equipment"],
  },
  {
    id: "rates-read",
    persona: "elea",
    requires: ["cost:read"],
    tools: ["get_rates"],
  },
];

export function hasCapability(
  capability: CapabilityDefinition,
  persona: AssistantPersona,
  can: (permission: Permission) => boolean,
): boolean {
  if (capability.persona !== "both" && capability.persona !== persona) {
    return false;
  }

  return capability.requires.every((permission) => can(permission));
}

export function toolNamesFor(
  persona: AssistantPersona,
  can: (permission: Permission) => boolean,
): string[] {
  return CAPABILITY_DEFINITIONS.filter((capability) =>
    hasCapability(capability, persona, can),
  ).flatMap((capability) => [...capability.tools]);
}

export function personaAvailable(
  persona: AssistantPersona,
  can: (permission: Permission) => boolean,
): boolean {
  return toolNamesFor(persona, can).length > 0;
}

/**
 * Whether the persona has at least one domain capability beyond the shared
 * account/briefing bundle. Staff, for example, should not see Emma.
 */
export function personaHasDomainTools(
  persona: AssistantPersona,
  can: (permission: Permission) => boolean,
): boolean {
  return CAPABILITY_DEFINITIONS.some(
    (capability) =>
      capability.id !== "account" &&
      capability.persona === persona &&
      capability.requires.every((permission) => can(permission)),
  );
}
