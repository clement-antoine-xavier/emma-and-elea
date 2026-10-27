"use server";

import {getActorContext} from "@/server/auth/actor";
import {siteService} from "@/server/services/container";
import {
  createSiteSchema,
  siteIdSchema,
  updateSiteSchema,
  type SiteKind,
} from "@/server/validators/site.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type SiteActionResult = {ok: true} | {ok: false; error: ActionErrorKey};

function toSiteInput(data: {
  name: string;
  code: string;
  kind: string;
  city: string;
  timezone: string;
}) {
  return {
    name: data.name,
    code: data.code.toUpperCase(),
    kind: data.kind as SiteKind,
    city: data.city ? data.city : null,
    timezone: data.timezone,
  };
}

export async function createSiteAction(input: unknown): Promise<SiteActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = createSiteSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await siteService.createSite(actor, toSiteInput(parsed.data));
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function updateSiteAction(input: unknown): Promise<SiteActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = updateSiteSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await siteService.updateSite(actor, {
      id: parsed.data.id,
      ...toSiteInput(parsed.data),
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function archiveSiteAction(input: unknown): Promise<SiteActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = siteIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await siteService.archiveSite(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
