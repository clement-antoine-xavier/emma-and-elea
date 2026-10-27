"use server";

import {getActorContext} from "@/server/auth/actor";
import {rateService} from "@/server/services/container";
import {
  createEnergyTariffSchema,
  createLabourRateSchema,
  rateIdSchema,
  type EnergyKind,
} from "@/server/validators/rate.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type RateActionResult = {ok: true} | {ok: false; error: ActionErrorKey};

export async function createLabourRateAction(
  input: unknown,
): Promise<RateActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = createLabourRateSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await rateService.createLabourRate(actor, {
      label: parsed.data.label,
      hourlyCost: parsed.data.hourlyCost,
      siteId: parsed.data.siteId ? parsed.data.siteId : null,
      validFrom: new Date(`${parsed.data.validFrom}T00:00:00.000Z`),
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function archiveLabourRateAction(
  input: unknown,
): Promise<RateActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = rateIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await rateService.archiveLabourRate(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function createEnergyTariffAction(
  input: unknown,
): Promise<RateActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = createEnergyTariffSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await rateService.createEnergyTariff(actor, {
      siteId: parsed.data.siteId,
      energyKind: parsed.data.energyKind as EnergyKind,
      pricePerKwh: parsed.data.pricePerKwh,
      validFrom: new Date(`${parsed.data.validFrom}T00:00:00.000Z`),
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function closeEnergyTariffAction(
  input: unknown,
): Promise<RateActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = rateIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await rateService.closeEnergyTariff(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
