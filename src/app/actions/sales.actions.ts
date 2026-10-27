"use server";

import {getActorContext} from "@/server/auth/actor";
import {
  dailySalesService,
  dispatchService,
  orderService,
} from "@/server/services/container";
import {
  dailySalesInputSchema,
  dispatchIdSchema,
  dispatchInputSchema,
  dispatchLineIdSchema,
  dispatchLineInputSchema,
  orderIdSchema,
  orderInputSchema,
  orderLineIdSchema,
  orderLineInputSchema,
} from "@/server/validators/sales.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type SalesActionResult =
  | ({ok: true} & {orderId?: string; dispatchId?: string})
  | {ok: false; error: ActionErrorKey};

export async function createOrderAction(
  input: unknown,
): Promise<SalesActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = orderInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {id} = await orderService.createOrder(actor, {
      customerId: parsed.data.customerId,
      siteId: parsed.data.siteId,
      requestedFor: new Date(`${parsed.data.requestedFor}T00:00:00.000Z`),
      note: parsed.data.note || null,
    });
    return {ok: true, orderId: id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function addOrderLineAction(
  orderId: unknown,
  input: unknown,
): Promise<SalesActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = orderIdSchema.safeParse({id: orderId});
  const parsed = orderLineInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await orderService.addLine(actor, parsedId.data.id, {
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
      unitId: parsed.data.unitId,
      unitPrice: parsed.data.unitPrice,
      note: parsed.data.note || null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removeOrderLineAction(
  input: unknown,
): Promise<SalesActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = orderLineIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await orderService.removeLine(
      actor,
      parsed.data.orderId,
      parsed.data.lineId,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function confirmOrderAction(
  input: unknown,
): Promise<SalesActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = orderIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await orderService.confirmOrder(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function cancelOrderAction(
  input: unknown,
): Promise<SalesActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = orderIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await orderService.cancelOrder(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function createDispatchAction(
  input: unknown,
): Promise<SalesActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = dispatchInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {id} = await dispatchService.createDispatch(actor, {
      siteId: parsed.data.siteId,
      customerId: parsed.data.customerId || null,
      orderId: parsed.data.orderId || null,
      carrier: parsed.data.carrier || null,
      note: parsed.data.note || null,
    });
    return {ok: true, dispatchId: id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function addDispatchLineAction(
  dispatchId: unknown,
  input: unknown,
): Promise<SalesActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = dispatchIdSchema.safeParse({id: dispatchId});
  const parsed = dispatchLineInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await dispatchService.addLine(actor, parsedId.data.id, {
      lotId: parsed.data.lotId,
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice || null,
      note: parsed.data.note || null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removeDispatchLineAction(
  input: unknown,
): Promise<SalesActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = dispatchLineIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await dispatchService.removeLine(
      actor,
      parsed.data.dispatchId,
      parsed.data.lineId,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function postDispatchAction(
  input: unknown,
): Promise<SalesActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = dispatchIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await dispatchService.postDispatch(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function cancelDispatchAction(
  input: unknown,
): Promise<SalesActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = dispatchIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await dispatchService.cancelDispatch(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function recordDailySalesAction(
  input: unknown,
): Promise<SalesActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = dailySalesInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await dailySalesService.recordDailySales(actor, {
      siteId: parsed.data.siteId,
      itemId: parsed.data.itemId,
      businessDate: new Date(`${parsed.data.businessDate}T00:00:00.000Z`),
      channel: parsed.data.channel as "RETAIL" | "WHOLESALE" | "BOTH" | "NONE",
      quantitySold: parsed.data.quantitySold,
      revenue: parsed.data.revenue,
      note: parsed.data.note || null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
