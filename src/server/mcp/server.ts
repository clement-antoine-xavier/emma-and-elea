import {McpServer} from "@modelcontextprotocol/server";
import type {OrganizationActor} from "@/server/auth/types";
import {registerAccountTools, registerSiteTools} from "./tools/account-sites";
import {registerCatalogTools} from "./tools/catalog";
import {registerDispatchTools} from "./tools/dispatch";
import {registerPlanningTools} from "./tools/planning";
import {registerProductionTools} from "./tools/production";
import {registerRecipeTools} from "./tools/recipes";
import {registerPurchasingTools} from "./tools/purchasing";
import {registerReportTools} from "./tools/reports";
import {registerSalesTools} from "./tools/sales";
import {registerStockTools} from "./tools/stock";
import {registerSupplierTools} from "./tools/suppliers";
import {registerTaskTools} from "./tools/tasks";
import {registerTeamTools} from "./tools/team";
import type {McpDeps} from "./deps";

export const MCP_SERVER_NAME = "emma-and-elea";
export const MCP_SERVER_VERSION = "0.1.0";

/**
 * Builds one MCP server for one caller. The factory runs per request, so no
 * state leaks between requests or tenants. Every tool is a thin wrapper over a
 * service, which applies the fine-grained role check on top of the token's
 * scopes.
 */
export function registerTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
): McpServer {
  registerAccountTools(server, actor);
  registerSiteTools(server, actor, deps);
  registerCatalogTools(server, actor, deps);
  registerRecipeTools(server, actor, deps);
  registerSupplierTools(server, actor, deps);
  registerPurchasingTools(server, actor, deps);
  registerStockTools(server, actor, deps);
  registerProductionTools(server, actor, deps);
  registerPlanningTools(server, actor, deps);
  registerSalesTools(server, actor, deps);
  registerDispatchTools(server, actor, deps);
  registerReportTools(server, actor, deps);
  registerTaskTools(server, actor, deps);
  registerTeamTools(server, actor, deps);

  return server;
}

/** Builds a fresh server for one caller. */
export function createMcpServer(
  actor: OrganizationActor,
  deps: McpDeps,
): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  return registerTools(server, actor, deps);
}
