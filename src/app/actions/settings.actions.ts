"use server";

import {getActorContext} from "@/server/auth/actor";
import {settingsService} from "@/server/services/container";
import {updateOrganizationSettingsSchema} from "@/server/validators/settings.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type SettingsActionResult =
  | {ok: true}
  | {ok: false; error: ActionErrorKey};

export async function updateOrganizationSettingsAction(
  input: unknown,
): Promise<SettingsActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = updateOrganizationSettingsSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await settingsService.updateSettings(actor, {
      currency: parsed.data.currency.toUpperCase(),
      overheadPct: parsed.data.overheadPct,
      forecastHistoryDays: Number(parsed.data.forecastHistoryDays),
      forecastSafetyPct: parsed.data.forecastSafetyPct,
      defaultShelfLifeDays:
        parsed.data.defaultShelfLifeDays === ""
          ? null
          : Number(parsed.data.defaultShelfLifeDays),
      lotNumberPattern: parsed.data.lotNumberPattern,
      pricesIncludeVat: parsed.data.pricesIncludeVat === "true",
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
