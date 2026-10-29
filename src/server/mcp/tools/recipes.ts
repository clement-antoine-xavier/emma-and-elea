import type {McpServer} from "@modelcontextprotocol/server";
import {z} from "zod";
import type {OrganizationActor} from "@/server/auth/types";
import {
  idSchema,
  recipeCreateSchema,
  recipeLineCreateSchema,
  recipeOperationCreateSchema,
  recipeOperationRefSchema,
  recipeVersionCreateSchema,
  recipeVersionUpdateSchema,
} from "@/server/validators/api.schema";
import {runTool} from "../result";
import {readScope, writeScope, type McpDeps} from "./shared";

export function registerRecipeTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "list_recipes",
    {
      description:
        "List recipes with their output item, published version and draft state.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.recipe.getRecipes(actor)),
  );

  server.registerTool(
    "get_recipe",
    {
      description:
        "Read one recipe with its versions, ingredients and operations.",
      inputSchema: idSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.recipe.getRecipe(actor, id)),
  );

  server.registerTool(
    "get_recipe_options",
    {
      description:
        "List the output items, ingredient items, units, equipment and labour rates needed to build a recipe.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.recipe.getOptions(actor)),
  );

  server.registerTool(
    "create_recipe",
    {
      description:
        "Create a recipe with a first draft version. Returns recipeId and versionId; add lines and publish next.",
      inputSchema: recipeCreateSchema,
      scopeChallenge: writeScope,
    },
    async (input) =>
      runTool(() =>
        deps.recipe.createRecipe(actor, {
          code: input.code,
          name: input.name,
          description: input.description || null,
          outputItemId: input.outputItemId,
        }),
      ),
  );

  server.registerTool(
    "update_recipe_version",
    {
      description:
        "Set the yield, portions and instructions on a draft recipe version before publishing.",
      inputSchema: recipeVersionUpdateSchema.extend({
        id: z.string().trim().min(1),
      }),
      scopeChallenge: writeScope,
    },
    async ({id, ...input}) =>
      runTool(() =>
        deps.recipe.updateVersion(actor, id, {
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
      ),
  );

  server.registerTool(
    "add_recipe_line",
    {
      description:
        "Add an ingredient line to a draft recipe version.",
      inputSchema: recipeLineCreateSchema,
      scopeChallenge: writeScope,
    },
    async ({versionId, line}) =>
      runTool(() =>
        deps.recipe.addLine(actor, versionId, {
          itemId: line.itemId,
          quantity: line.quantity,
          unitId: line.unitId,
          lossPct: line.lossPct,
          isOptional: line.isOptional,
          note: line.note || null,
        }),
      ),
  );

  server.registerTool(
    "create_recipe_version",
    {
      description:
        "Open a new draft version of a recipe, optionally copying a source version. Operations can only be added to a draft.",
      inputSchema: recipeVersionCreateSchema,
      scopeChallenge: writeScope,
    },
    async ({recipeId, sourceVersionId}) =>
      runTool(() =>
        deps.recipe.createVersion(actor, recipeId, sourceVersionId || null),
      ),
  );

  server.registerTool(
    "add_recipe_operation",
    {
      description:
        "Add an operation to a draft recipe version. Publishing the version lets batches turn its operations into production tasks.",
      inputSchema: recipeOperationCreateSchema,
      scopeChallenge: writeScope,
    },
    async ({versionId, line}) =>
      runTool(() =>
        deps.recipe.addOperation(actor, versionId, {
          name: line.name,
          description: line.description || null,
          durationMinutes: Number(line.durationMinutes),
          activeMinutes:
            line.activeMinutes === "" ? null : Number(line.activeMinutes),
          equipmentId: line.equipmentId || null,
          labourRateId: line.labourRateId || null,
          requiredSkillId: line.requiredSkillId || null,
        }),
      ),
  );

  server.registerTool(
    "remove_recipe_operation",
    {
      description: "Remove an operation from a draft recipe version.",
      inputSchema: recipeOperationRefSchema,
      scopeChallenge: writeScope,
    },
    async ({versionId, operationId}) =>
      runTool(() =>
        deps.recipe.removeOperation(actor, versionId, operationId),
      ),
  );

  server.registerTool(
    "publish_recipe_version",
    {
      description:
        "Publish a draft recipe version. Only published versions can be used to create production batches.",
      inputSchema: idSchema,
      scopeChallenge: writeScope,
    },
    async ({id}) => runTool(() => deps.recipe.publishVersion(actor, id)),
  );
}
