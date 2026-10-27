"use server";

import {getActorContext} from "@/server/auth/actor";
import {planningService} from "@/server/services/container";
import {
  planIdSchema,
  planInputSchema,
  planLineBatchSchema,
  planLineIdSchema,
  planLineInputSchema,
  planLineUpdateSchema,
} from "@/server/validators/planning.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type PlanningActionResult =
  | ({ok: true} & {planId?: string; batchId?: string})
  | {ok: false; error: ActionErrorKey};

export async function createPlanAction(
  input: unknown,
): Promise<PlanningActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = planInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {id} = await planningService.createPlan(actor, {
      siteId: parsed.data.siteId,
      plannedFor: new Date(`${parsed.data.plannedFor}T00:00:00.000Z`),
      includeForecast: parsed.data.includeForecast,
      includeOrders: parsed.data.includeOrders,
      note: parsed.data.note || null,
    });
    return {ok: true, planId: id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function addPlanLineAction(
  planId: unknown,
  input: unknown,
): Promise<PlanningActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = planIdSchema.safeParse({id: planId});
  const parsed = planLineInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await planningService.addLine(actor, parsedId.data.id, {
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
      note: parsed.data.note || null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function updatePlanLineAction(
  planId: unknown,
  input: unknown,
): Promise<PlanningActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = planIdSchema.safeParse({id: planId});
  const parsed = planLineUpdateSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await planningService.updateLine(
      actor,
      parsedId.data.id,
      parsed.data.lineId,
      parsed.data.quantity,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removePlanLineAction(
  input: unknown,
): Promise<PlanningActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = planLineIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await planningService.removeLine(
      actor,
      parsed.data.planId,
      parsed.data.lineId,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function confirmPlanAction(
  input: unknown,
): Promise<PlanningActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = planIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await planningService.confirmPlan(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function closePlanAction(
  input: unknown,
): Promise<PlanningActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = planIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await planningService.closePlan(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function cancelPlanAction(
  input: unknown,
): Promise<PlanningActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = planIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await planningService.cancelPlan(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function createBatchFromPlanLineAction(
  input: unknown,
): Promise<PlanningActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = planLineBatchSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {batchId} = await planningService.createBatchFromLine(
      actor,
      parsed.data.lineId,
    );
    return {ok: true, batchId};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
