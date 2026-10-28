import {z} from "zod";
import {catalogService} from "@/server/services/container";
import {
  catalogFiltersSchema,
  catalogItemSchema,
  catalogItemUpdateSchema,
  idSchema,
} from "@/server/validators/api.schema";
import {assistantTool} from "./shared";

export const catalogTools = {
  listItems: assistantTool({
    name: "list_catalog_items",
    description:
      "Search catalog items with pagination. Use this before creating an order or a recipe so you use real item ids.",
    parameters: catalogFiltersSchema,
    execute: async (input, context) => {
      const view = await catalogService.getCatalogView(context.actor, {
        search: input.search,
        type: input.type,
        categoryId: input.categoryId,
        includeArchived: input.includeArchived ? "true" : undefined,
        page: input.page?.toString(),
        pageSize: input.pageSize?.toString(),
      });

      return {
        total: view.page.total,
        page: view.page.page,
        pageSize: view.page.pageSize,
        items: view.page.items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          type: item.type,
          categoryName: item.categoryName,
          stockUnitCode: item.stockUnitCode,
          salePrice: item.salePrice,
          isSellable: item.isSellable,
        })),
      };
    },
  }),

  getItem: assistantTool({
    name: "get_catalog_item",
    description:
      "Read one catalog item with its units, prices, allergens and production flags.",
    parameters: idSchema,
    execute: async ({id}, context) =>
      catalogService.getItem(context.actor, id),
  }),

  createItem: assistantTool({
    name: "create_catalog_item",
    description:
      "Create a catalog item. Read the form options first. Returns the new item id.",
    parameters: catalogItemSchema,
    execute: async (input, context) =>
      catalogService.createItem(context.actor, input),
  }),

  updateItem: assistantTool({
    name: "update_catalog_item",
    description:
      "Replace a catalog item's fields. Read it first and send every field back.",
    parameters: catalogItemUpdateSchema,
    execute: async ({id, ...input}, context) =>
      catalogService.updateItem(context.actor, id, input),
  }),

  archiveItem: assistantTool({
    name: "archive_catalog_item",
    description:
      "Archive a catalog item. History is kept, but it stops appearing in lists.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      catalogService.archiveItem(context.actor, id),
  }),

  listCategories: assistantTool({
    name: "list_categories",
    description: "List item categories in display order.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      catalogService.getCategoriesView(context.actor),
  }),

  archiveCategory: assistantTool({
    name: "archive_category",
    description:
      "Archive an item category. Its items keep their history but leave the category.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      catalogService.archiveCategory(context.actor, id),
  }),
};
