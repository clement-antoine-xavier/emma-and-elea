import type {McpServer} from "@modelcontextprotocol/server";
import type {OrganizationActor} from "@/server/auth/types";
import {runTool} from "../result";
import {
  catalogFiltersSchema,
  catalogItemSchema,
  catalogItemUpdateSchema,
  idSchema,
} from "@/server/validators/api.schema";
import {pageFilters, readScope, writeScope, type McpDeps} from "./shared";

export function registerCatalogTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "list_catalog_items",
    {
      description:
        "Search the catalog with pagination. Returns rows plus the active filters and whether the caller may write.",
      inputSchema: catalogFiltersSchema,
      scopeChallenge: readScope,
    },
    async (input) =>
      runTool(() =>
        deps.catalog.getCatalogView(actor, {
          ...pageFilters(input),
          type: input.type,
          categoryId: input.categoryId,
          includeArchived: input.includeArchived ? "true" : undefined,
        }),
      ),
  );

  server.registerTool(
    "get_catalog_item",
    {
      description:
        "Read one catalog item, including its stock unit, prices, allergens and production flags.",
      inputSchema: idSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.catalog.getItem(actor, id)),
  );

  server.registerTool(
    "list_categories",
    {
      description: "List item categories in display order.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.catalog.getCategoriesView(actor)),
  );

  server.registerTool(
    "get_catalog_form_options",
    {
      description:
        "List the units, categories and allergens needed to build a catalog item payload.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.catalog.getItemFormOptions(actor)),
  );

  server.registerTool(
    "create_catalog_item",
    {
      description:
        "Create a catalog item. Returns its id. Codes are unique per organization.",
      inputSchema: catalogItemSchema,
      scopeChallenge: writeScope,
    },
    async (input) => runTool(() => deps.catalog.createItem(actor, input)),
  );

  server.registerTool(
    "update_catalog_item",
    {
      description:
        "Replace an existing catalog item's fields. Read it first so you send every field back.",
      inputSchema: catalogItemUpdateSchema,
      scopeChallenge: writeScope,
    },
    async ({id, ...input}) =>
      runTool(() => deps.catalog.updateItem(actor, id, input)),
  );

  server.registerTool(
    "archive_catalog_item",
    {
      description:
        "Archive a catalog item. It stops appearing in lists but its history is kept.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.catalog.archiveItem(actor, id)),
  );
}
