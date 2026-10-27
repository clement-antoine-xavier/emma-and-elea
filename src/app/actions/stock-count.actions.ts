"use server";

import {getActorContext} from "@/server/auth/actor";
import {stockCountService} from "@/server/services/container";
import {
  stockCountIdSchema,
  stockCountInputSchema,
  stockCountLinesSchema,
} from "@/server/validators/stock-count.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type StockCountActionResult =
  | ({ok: true} & {countId?: string})
  | {ok: false; error: ActionErrorKey};

export async function createStockCountAction(
  input: unknown,
): Promise<StockCountActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = stockCountInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {id} = await stockCountService.createCount(actor, {
      siteId: parsed.data.siteId,
      countedAt: new Date(`${parsed.data.countedAt}T00:00:00.000Z`),
      note: parsed.data.note || null,
    });
    return {ok: true, countId: id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function updateStockCountLinesAction(
  countId: unknown,
  input: unknown,
): Promise<StockCountActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = stockCountIdSchema.safeParse({id: countId});
  const parsed = stockCountLinesSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await stockCountService.updateLines(
      actor,
      parsedId.data.id,
      parsed.data.lines,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function postStockCountAction(
  input: unknown,
): Promise<StockCountActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = stockCountIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await stockCountService.postCount(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function cancelStockCountAction(
  input: unknown,
): Promise<StockCountActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = stockCountIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await stockCountService.cancelCount(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
