"use server";

import {getActorContext} from "@/server/auth/actor";
import {productionService} from "@/server/services/container";
import {
  completeBatchSchema,
  productionBatchIdSchema,
  productionBatchSchema,
  wasteIdSchema,
  wasteSchema,
} from "@/server/validators/production.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type ProductionActionResult =
  | ({ok: true} & {batchId?: string})
  | {ok: false; error: ActionErrorKey};

export async function createProductionBatchAction(
  input: unknown,
): Promise<ProductionActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = productionBatchSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const result = await productionService.createBatch(actor, {
      siteId: parsed.data.siteId,
      recipeVersionId: parsed.data.recipeVersionId,
      plannedQuantity: parsed.data.plannedQuantity,
      plannedStartAt: parsed.data.plannedStartAt
        ? new Date(`${parsed.data.plannedStartAt}T00:00:00.000Z`)
        : null,
      note: parsed.data.note || null,
    });
    return {ok: true, batchId: result.id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function startProductionBatchAction(
  input: unknown,
): Promise<ProductionActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = productionBatchIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await productionService.startBatch(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function cancelProductionBatchAction(
  input: unknown,
): Promise<ProductionActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = productionBatchIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await productionService.cancelBatch(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function completeProductionBatchAction(
  id: unknown,
  input: unknown,
): Promise<ProductionActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = productionBatchIdSchema.safeParse({id});
  const parsed = completeBatchSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await productionService.completeBatch(actor, parsedId.data.id, {
      actualQuantity: parsed.data.actualQuantity,
      producedOn: parsed.data.producedOn
        ? new Date(`${parsed.data.producedOn}T00:00:00.000Z`)
        : null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function recordWasteAction(
  input: unknown,
): Promise<ProductionActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = wasteSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  const recordedAt = parsed.data.recordedAt
    ? new Date(`${parsed.data.recordedAt}T00:00:00.000Z`)
    : new Date();

  try {
    await productionService.recordWaste(actor, {
      lotId: parsed.data.lotId,
      lossReasonId: parsed.data.lossReasonId,
      quantity: parsed.data.quantity,
      reason: parsed.data.reason || null,
      recordedAt,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function archiveWasteAction(
  input: unknown,
): Promise<ProductionActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = wasteIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await productionService.archiveWaste(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
