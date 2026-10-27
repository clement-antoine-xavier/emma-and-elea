"use server";

import {getActorContext} from "@/server/auth/actor";
import {supplierService} from "@/server/services/container";
import {
  supplierIdSchema,
  supplierInputSchema,
  supplierItemIdSchema,
  supplierItemInputSchema,
} from "@/server/validators/supplier.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type SupplierActionResult =
  | ({ok: true} & {supplierId?: string})
  | {ok: false; error: ActionErrorKey};

export async function createSupplierAction(
  input: unknown,
): Promise<SupplierActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = supplierInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {id} = await supplierService.createSupplier(actor, {
      code: parsed.data.code,
      name: parsed.data.name,
      contactName: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      defaultLeadTimeDays:
        parsed.data.defaultLeadTimeDays === ""
          ? null
          : Number(parsed.data.defaultLeadTimeDays),
      note: parsed.data.note || null,
    });
    return {ok: true, supplierId: id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function updateSupplierAction(
  id: unknown,
  input: unknown,
): Promise<SupplierActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = supplierIdSchema.safeParse({id});
  const parsed = supplierInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await supplierService.updateSupplier(actor, parsedId.data.id, {
      code: parsed.data.code,
      name: parsed.data.name,
      contactName: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      defaultLeadTimeDays:
        parsed.data.defaultLeadTimeDays === ""
          ? null
          : Number(parsed.data.defaultLeadTimeDays),
      note: parsed.data.note || null,
    });
    return {ok: true, supplierId: parsedId.data.id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function archiveSupplierAction(
  input: unknown,
): Promise<SupplierActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = supplierIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await supplierService.archiveSupplier(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function createSupplierItemAction(
  supplierId: unknown,
  input: unknown,
): Promise<SupplierActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedSupplier = supplierIdSchema.safeParse({id: supplierId});
  const parsed = supplierItemInputSchema((key) => key).safeParse(input);
  if (!parsedSupplier.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await supplierService.createItem(actor, parsedSupplier.data.id, {
      itemId: parsed.data.itemId,
      supplierRef: parsed.data.supplierRef || null,
      packQuantity: parsed.data.packQuantity,
      packUnitId: parsed.data.packUnitId,
      price: parsed.data.price,
      leadTimeDays:
        parsed.data.leadTimeDays === ""
          ? null
          : Number(parsed.data.leadTimeDays),
      minOrderQuantity:
        parsed.data.minOrderQuantity === ""
          ? null
          : parsed.data.minOrderQuantity,
      isPreferred: parsed.data.isPreferred,
      validFrom: new Date(`${parsed.data.validFrom}T00:00:00.000Z`),
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function closeSupplierItemAction(
  input: unknown,
): Promise<SupplierActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = supplierItemIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await supplierService.closeItem(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
