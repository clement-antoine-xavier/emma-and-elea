import {
  catalogService,
  customerService,
  dailySalesService,
  dashboardService,
  dispatchService,
  orderService,
  planningService,
  productionService,
  purchasingService,
  recipeService,
  reportService,
  siteService,
  stockCountService,
  stockService,
  supplierService,
  teamService,
} from "@/server/services/container";

/**
 * Services the MCP tools wrap. Kept out of `tools/shared.ts` so tool modules and
 * their tests never load the auth instance; only the route handler wires the
 * real container.
 */
export const mcpDeps = {
  catalog: catalogService,
  customer: customerService,
  dailySales: dailySalesService,
  dashboard: dashboardService,
  dispatch: dispatchService,
  order: orderService,
  planning: planningService,
  production: productionService,
  purchasing: purchasingService,
  recipe: recipeService,
  report: reportService,
  site: siteService,
  stockCount: stockCountService,
  stock: stockService,
  supplier: supplierService,
  team: teamService,
};

export type McpDeps = typeof mcpDeps;
