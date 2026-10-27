"use server";

import {getActorContext} from "@/server/auth/actor";
import {purchasingService} from "@/server/services/container";
import {
  receiptDraftSchema,
  receiptIdSchema,
  receiptLineIdSchema,
  receiptLineSchema,
} from "@/server/validators/purchasing.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type PurchasingActionResult =
  | ({ok: true} & {receiptId?: string})
  | {ok: false; error: ActionErrorKey};

export async function createReceiptDraftAction(
  input: unknown,
): Promise<PurchasingActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = receiptDraftSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {id} = await purchasingService.createDraft(actor, {
      siteId: parsed.data.siteId,
      supplierId: parsed.data.supplierId,
      supplierReference: parsed.data.supplierReference || null,
      note: parsed.data.note || null,
    });
    return {ok: true, receiptId: id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function addReceiptLineAction(
  receiptId: unknown,
  input: unknown,
): Promise<PurchasingActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = receiptIdSchema.safeParse({id: receiptId});
  const parsed = receiptLineSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await purchasingService.addLine(actor, parsedId.data.id, {
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
      unitId: parsed.data.unitId,
      unitPrice: parsed.data.unitPrice,
      lotNumber: parsed.data.lotNumber || null,
      supplierLotNumber: parsed.data.supplierLotNumber || null,
      expiresOn: parsed.data.expiresOn
        ? new Date(`${parsed.data.expiresOn}T00:00:00.000Z`)
        : null,
      bestBeforeOn: parsed.data.bestBeforeOn
        ? new Date(`${parsed.data.bestBeforeOn}T00:00:00.000Z`)
        : null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removeReceiptLineAction(
  input: unknown,
): Promise<PurchasingActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = receiptLineIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await purchasingService.removeLine(
      actor,
      parsed.data.receiptId,
      parsed.data.lineId,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function postReceiptAction(
  input: unknown,
): Promise<PurchasingActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = receiptIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await purchasingService.postReceipt(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function cancelReceiptAction(
  input: unknown,
): Promise<PurchasingActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = receiptIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await purchasingService.cancelReceipt(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
