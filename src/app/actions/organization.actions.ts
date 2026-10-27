"use server";

import {headers} from "next/headers";
import {getActorContext} from "@/server/auth/actor";
import {isDomainError} from "@/server/domain/errors";
import {organizationService} from "@/server/services/container";
import {createOrganizationSchema} from "@/server/validators/organization.schema";

export type OrganizationActionError =
  | "unauthenticated"
  | "slugTaken"
  | "invalid"
  | "forbidden"
  | "generic";

export type CreateOrganizationActionResult =
  | {ok: true; organization: {id: string; name: string; slug: string}}
  | {ok: false; error: OrganizationActionError};

export async function createOrganizationAction(input: {
  name: string;
  slug: string;
  siteName: string;
  siteCode: string;
}): Promise<CreateOrganizationActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = createOrganizationSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalid"};

  try {
    const organization = await organizationService.createOrganization(
      actor,
      parsed.data,
      await headers(),
    );

    return {ok: true, organization};
  } catch (error) {
    if (!isDomainError(error)) return {ok: false, error: "generic"};

    switch (error.code) {
      case "CONFLICT":
        return {ok: false, error: "slugTaken"};
      case "FORBIDDEN":
        return {ok: false, error: "forbidden"};
      default:
        return {ok: false, error: "generic"};
    }
  }
}
