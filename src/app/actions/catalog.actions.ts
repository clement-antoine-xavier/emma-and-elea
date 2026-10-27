"use server";

import {getActorContext} from "@/server/auth/actor";
import {catalogService} from "@/server/services/container";
import {
  categoryIdSchema,
  categoryInputSchema,
  itemAllergenIdSchema,
  itemAllergenSchema,
  itemIdSchema,
  itemInputSchema,
} from "@/server/validators/catalog.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type CatalogActionResult =
  | ({ok: true} & {itemId?: string; categoryId?: string})
  | {ok: false; error: ActionErrorKey};

export async function createItemAction(
  input: unknown,
): Promise<CatalogActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = itemInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {id} = await catalogService.createItem(actor, parsed.data);
    return {ok: true, itemId: id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function updateItemAction(
  id: unknown,
  input: unknown,
): Promise<CatalogActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = itemIdSchema.safeParse({id});
  const parsed = itemInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await catalogService.updateItem(actor, parsedId.data.id, parsed.data);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function archiveItemAction(
  input: unknown,
): Promise<CatalogActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = itemIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await catalogService.archiveItem(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function createCategoryAction(
  input: unknown,
): Promise<CatalogActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = categoryInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {id} = await catalogService.createCategory(actor, parsed.data);
    return {ok: true, categoryId: id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function archiveCategoryAction(
  input: unknown,
): Promise<CatalogActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = categoryIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await catalogService.archiveCategory(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function addItemAllergenAction(
  input: unknown,
): Promise<CatalogActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = itemAllergenSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await catalogService.setItemAllergen(actor, parsed.data);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removeItemAllergenAction(
  input: unknown,
): Promise<CatalogActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = itemAllergenIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await catalogService.removeItemAllergen(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
