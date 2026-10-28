import type {Permission} from "@/lib/permissions";
import type {AssistantPersona} from "../context";
import type {AssistantTool} from "../tools/shared";
import {accountTools} from "../tools/account";
import {catalogTools} from "../tools/catalog";
import {planningTools} from "../tools/planning";
import {productionTools} from "../tools/production";
import {purchasingTools} from "../tools/purchasing";
import {recipeTools} from "../tools/recipes";
import {reportTools} from "../tools/reports";
import {
  customerTools,
  dailySalesTools,
  dispatchTools,
  orderTools,
} from "../tools/sales";
import {stockTools} from "../tools/stock";
import {supplierTools} from "../tools/suppliers";
import {teamTools} from "../tools/team";
import {settingsTools} from "../tools/settings";
import {
  CAPABILITY_DEFINITIONS,
  hasCapability,
  personaAvailable,
  personaHasDomainTools,
  toolNamesFor,
  type CapabilityDefinition,
} from "./catalog";

export {
  CAPABILITY_DEFINITIONS as CAPABILITIES,
  hasCapability,
  personaAvailable,
  personaHasDomainTools,
  toolNamesFor,
  type CapabilityDefinition,
};

/**
 * The concrete tool registry. The pure catalogue in `catalog.ts` decides who
 * sees a tool; this map decides which implementation that name points at.
 */
const ALL_TOOLS: readonly AssistantTool[] = [
  ...Object.values(accountTools),
  ...Object.values(catalogTools),
  ...Object.values(customerTools),
  ...Object.values(orderTools),
  ...Object.values(dispatchTools),
  ...Object.values(dailySalesTools),
  ...Object.values(productionTools),
  ...Object.values(planningTools),
  ...Object.values(stockTools),
  ...Object.values(purchasingTools),
  ...Object.values(supplierTools),
  ...Object.values(recipeTools),
  ...Object.values(reportTools),
  ...Object.values(teamTools),
  ...Object.values(settingsTools),
];

const TOOL_REGISTRY: Readonly<Record<string, AssistantTool>> =
  Object.fromEntries(ALL_TOOLS.map((tool) => [tool.name, tool]));

export function toolsFor(
  persona: AssistantPersona,
  can: (permission: Permission) => boolean,
): AssistantTool[] {
  return toolNamesFor(persona, can).map((name) => {
    const tool = TOOL_REGISTRY[name];
    if (!tool) throw new Error(`Unknown assistant tool: ${name}`);
    return tool;
  });
}
