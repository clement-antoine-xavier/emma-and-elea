"use server";

import {getActorContext} from "@/server/auth/actor";
import {equipmentService} from "@/server/services/container";
import {
  createEquipmentSchema,
  equipmentIdSchema,
  type EquipmentKind,
} from "@/server/validators/equipment.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type EquipmentActionResult =
  | {ok: true}
  | {ok: false; error: ActionErrorKey};

export async function createEquipmentAction(
  input: unknown,
): Promise<EquipmentActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = createEquipmentSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await equipmentService.createEquipment(actor, {
      name: parsed.data.name,
      kind: parsed.data.kind as EquipmentKind,
      siteId: parsed.data.siteId ? parsed.data.siteId : null,
      powerKw: parsed.data.powerKw ? parsed.data.powerKw : null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function archiveEquipmentAction(
  input: unknown,
): Promise<EquipmentActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = equipmentIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await equipmentService.archiveEquipment(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
