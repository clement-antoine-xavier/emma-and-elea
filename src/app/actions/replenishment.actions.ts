"use server";

import {z} from "zod";
import {getActorContext} from "@/server/auth/actor";
import {purchasingService} from "@/server/services/container";
import {mapDomainError, type ActionErrorKey} from "./errors";

const inputSchema = z.object({
  siteId: z.string().trim().min(1),
  supplierId: z.string().trim().min(1),
  itemId: z.string().trim().min(1),
  quantity: z.string().trim().min(1),
  unitId: z.string().trim().min(1),
  unitPrice: z.string().trim().min(1),
});

export type ReplenishmentActionResult =
  | {ok: true; receiptId: string}
  | {ok: false; error: ActionErrorKey};

/**
 * Turns one suggestion into a draft purchase receipt with a single line. The
 * receipt stays a draft until a purchaser posts it.
 */
export async function createReplenishmentReceiptAction(
  input: unknown,
): Promise<ReplenishmentActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const draft = await purchasingService.createDraft(actor, {
      siteId: parsed.data.siteId,
      supplierId: parsed.data.supplierId,
      supplierReference: null,
      note: "Suggested replenishment",
    });
    await purchasingService.addLine(actor, draft.id, {
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
      unitId: parsed.data.unitId,
      unitPrice: parsed.data.unitPrice,
      lotNumber: null,
      supplierLotNumber: null,
      expiresOn: null,
      bestBeforeOn: null,
    });

    return {ok: true, receiptId: draft.id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
