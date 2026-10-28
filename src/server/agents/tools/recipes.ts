import {z} from "zod";
import {recipeService} from "@/server/services/container";
import {
  idSchema,
  recipeCreateSchema,
  recipeLineCreateSchema,
  recipeVersionUpdateSchema,
} from "@/server/validators/api.schema";
import {assistantTool} from "./shared";

const operationSchema = z.object({
  versionId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().min(1).max(100_000),
  activeMinutes: z.number().int().min(0).max(100_000).nullable().optional(),
  equipmentId: z.string().trim().nullable().optional(),
  labourRateId: z.string().trim().nullable().optional(),
});

export const recipeTools = {
  list: assistantTool({
    name: "list_recipes",
    description:
      "List recipes with their output item, published version and draft state.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      recipeService.getRecipes(context.actor),
  }),

  get: assistantTool({
    name: "get_recipe",
    description:
      "Read one recipe with its versions, ingredients, operations and cost snapshot.",
    parameters: idSchema,
    execute: async ({id}, context) =>
      recipeService.getRecipe(context.actor, id),
  }),

  options: assistantTool({
    name: "get_recipe_options",
    description:
      "List the output items, ingredient items, units, equipment and labour rates needed to build a recipe.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      recipeService.getOptions(context.actor),
  }),

  create: assistantTool({
    name: "create_recipe",
    description:
      "Create a recipe with a first draft version. Returns recipeId and versionId; add lines and publish next.",
    parameters: recipeCreateSchema,
    execute: async (input, context) =>
      recipeService.createRecipe(context.actor, {
        code: input.code,
        name: input.name,
        description: input.description || null,
        outputItemId: input.outputItemId,
      }),
  }),

  createVersion: assistantTool({
    name: "create_recipe_version",
    description:
      "Create a new draft version from an existing recipe version, or from scratch.",
    parameters: z.object({
      recipeId: z.string().trim().min(1),
      sourceVersionId: z.string().trim().nullable().optional(),
    }),
    execute: async ({recipeId, sourceVersionId}, context) =>
      recipeService.createVersion(
        context.actor,
        recipeId,
        sourceVersionId ?? null,
      ),
  }),

  updateVersion: assistantTool({
    name: "update_recipe_version",
    description:
      "Set the yield, portions and instructions on a draft recipe version before publishing.",
    parameters: recipeVersionUpdateSchema.extend({
      id: z.string().trim().min(1),
    }),
    execute: async ({id, ...input}, context) =>
      recipeService.updateVersion(context.actor, id, {
        yieldQuantity: input.yieldQuantity,
        yieldUnitId: input.yieldUnitId,
        portionCount:
          input.portionCount === "" ? null : Number(input.portionCount),
        prepMinutes:
          input.prepMinutes === "" ? null : Number(input.prepMinutes),
        cookMinutes:
          input.cookMinutes === "" ? null : Number(input.cookMinutes),
        instructions: input.instructions || null,
        changeNote: input.changeNote || null,
      }),
  }),

  addLine: assistantTool({
    name: "add_recipe_line",
    description: "Add an ingredient line to a draft recipe version.",
    parameters: recipeLineCreateSchema,
    execute: async ({versionId, line}, context) =>
      recipeService.addLine(context.actor, versionId, {
        itemId: line.itemId,
        quantity: line.quantity,
        unitId: line.unitId,
        lossPct: line.lossPct,
        isOptional: line.isOptional,
        note: line.note || null,
      }),
  }),

  removeLine: assistantTool({
    name: "remove_recipe_line",
    description: "Remove an ingredient line from a draft recipe version.",
    parameters: z.object({
      versionId: z.string().trim().min(1),
      lineId: z.string().trim().min(1),
    }),
    execute: async ({versionId, lineId}, context) =>
      recipeService.removeLine(context.actor, versionId, lineId),
  }),

  addOperation: assistantTool({
    name: "add_recipe_operation",
    description:
      "Add a labour or equipment operation to a draft recipe version.",
    parameters: operationSchema,
    execute: async (input, context) =>
      recipeService.addOperation(context.actor, input.versionId, {
        name: input.name,
        description: input.description || null,
        durationMinutes: input.durationMinutes,
        activeMinutes: input.activeMinutes ?? null,
        equipmentId: input.equipmentId ?? null,
        labourRateId: input.labourRateId ?? null,
      }),
  }),

  removeOperation: assistantTool({
    name: "remove_recipe_operation",
    description: "Remove an operation from a draft recipe version.",
    parameters: z.object({
      versionId: z.string().trim().min(1),
      operationId: z.string().trim().min(1),
    }),
    execute: async ({versionId, operationId}, context) =>
      recipeService.removeOperation(context.actor, versionId, operationId),
  }),

  publish: assistantTool({
    name: "publish_recipe_version",
    description:
      "Publish a draft recipe version. Every price, rate and tariff must resolve first.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      recipeService.publishVersion(context.actor, id),
  }),

  archive: assistantTool({
    name: "archive_recipe",
    description: "Archive a recipe. Its versions and history are kept.",
    parameters: idSchema,
    needsApproval: true,
    execute: async ({id}, context) =>
      recipeService.archiveRecipe(context.actor, id),
  }),
};
