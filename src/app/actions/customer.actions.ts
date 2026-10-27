"use server";

import {getActorContext} from "@/server/auth/actor";
import {customerService} from "@/server/services/container";
import {
  customerIdSchema,
  customerInputSchema,
} from "@/server/validators/customer.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type CustomerActionResult =
  | ({ok: true} & {customerId?: string})
  | {ok: false; error: ActionErrorKey};

function toInput(data: {
  code: string;
  name: string;
  type: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  vatNumber: string;
  note: string;
}) {
  return {
    code: data.code ? data.code.toUpperCase() : null,
    name: data.name,
    type: data.type as "BUSINESS" | "INDIVIDUAL",
    contactName: data.contactName || null,
    email: data.email || null,
    phone: data.phone || null,
    city: data.city || null,
    vatNumber: data.vatNumber || null,
    note: data.note || null,
  };
}

export async function createCustomerAction(
  input: unknown,
): Promise<CustomerActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = customerInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {id} = await customerService.createCustomer(
      actor,
      toInput(parsed.data),
    );
    return {ok: true, customerId: id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function updateCustomerAction(
  id: unknown,
  input: unknown,
): Promise<CustomerActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = customerIdSchema.safeParse({id});
  const parsed = customerInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await customerService.updateCustomer(
      actor,
      parsedId.data.id,
      toInput(parsed.data),
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function archiveCustomerAction(
  input: unknown,
): Promise<CustomerActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = customerIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await customerService.archiveCustomer(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
