"use server";

import {getActorContext} from "@/server/auth/actor";
import {recipeService} from "@/server/services/container";
import {
  recipeIdSchema,
  recipeInputSchema,
  recipeLineIdSchema,
  recipeLineInputSchema,
  recipeOperationIdSchema,
  recipeOperationInputSchema,
  recipeVersionIdSchema,
  recipeVersionInputSchema,
} from "@/server/validators/recipe.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type RecipeActionResult =
  | ({ok: true} & {recipeId?: string; versionId?: string})
  | {ok: false; error: ActionErrorKey};

export async function createRecipeAction(
  input: unknown,
): Promise<RecipeActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = recipeInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const result = await recipeService.createRecipe(actor, {
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description || null,
      outputItemId: parsed.data.outputItemId,
    });
    return {ok: true, ...result};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function createRecipeVersionAction(
  recipeId: unknown,
  sourceVersionId: unknown,
): Promise<RecipeActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = recipeIdSchema.safeParse({id: recipeId});
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  const source =
    typeof sourceVersionId === "string" && sourceVersionId ? sourceVersionId : null;

  try {
    const result = await recipeService.createVersion(
      actor,
      parsed.data.id,
      source,
    );
    return {ok: true, ...result};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function updateRecipeVersionAction(
  versionId: unknown,
  input: unknown,
): Promise<RecipeActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = recipeVersionIdSchema.safeParse({id: versionId});
  const parsed = recipeVersionInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await recipeService.updateVersion(actor, parsedId.data.id, {
      yieldQuantity: parsed.data.yieldQuantity,
      yieldUnitId: parsed.data.yieldUnitId,
      portionCount:
        parsed.data.portionCount === ""
          ? null
          : Number(parsed.data.portionCount),
      prepMinutes:
        parsed.data.prepMinutes === ""
          ? null
          : Number(parsed.data.prepMinutes),
      cookMinutes:
        parsed.data.cookMinutes === ""
          ? null
          : Number(parsed.data.cookMinutes),
      instructions: parsed.data.instructions || null,
      changeNote: parsed.data.changeNote || null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function addRecipeLineAction(
  versionId: unknown,
  input: unknown,
): Promise<RecipeActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = recipeVersionIdSchema.safeParse({id: versionId});
  const parsed = recipeLineInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await recipeService.addLine(actor, parsedId.data.id, {
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
      unitId: parsed.data.unitId,
      lossPct: parsed.data.lossPct,
      isOptional: parsed.data.isOptional,
      note: parsed.data.note || null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removeRecipeLineAction(
  input: unknown,
): Promise<RecipeActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = recipeLineIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await recipeService.removeLine(
      actor,
      parsed.data.versionId,
      parsed.data.lineId,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function addRecipeOperationAction(
  versionId: unknown,
  input: unknown,
): Promise<RecipeActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = recipeVersionIdSchema.safeParse({id: versionId});
  const parsed = recipeOperationInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await recipeService.addOperation(actor, parsedId.data.id, {
      name: parsed.data.name,
      description: parsed.data.description || null,
      durationMinutes: Number(parsed.data.durationMinutes),
      activeMinutes:
        parsed.data.activeMinutes === ""
          ? null
          : Number(parsed.data.activeMinutes),
      equipmentId: parsed.data.equipmentId || null,
      labourRateId: parsed.data.labourRateId || null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removeRecipeOperationAction(
  input: unknown,
): Promise<RecipeActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = recipeOperationIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await recipeService.removeOperation(
      actor,
      parsed.data.versionId,
      parsed.data.operationId,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function publishRecipeVersionAction(
  input: unknown,
): Promise<RecipeActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = recipeVersionIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await recipeService.publishVersion(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function archiveRecipeAction(
  input: unknown,
): Promise<RecipeActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = recipeIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await recipeService.archiveRecipe(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
