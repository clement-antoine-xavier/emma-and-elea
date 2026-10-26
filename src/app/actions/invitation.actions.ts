"use server";

import {headers} from "next/headers";
import {getActorContext} from "@/server/auth/actor";
import {isDomainError} from "@/server/domain/errors";
import {invitationService} from "@/server/services/container";
import {invitationIdSchema} from "@/server/validators/team.schema";

export type InvitationActionError =
  | "unauthenticated"
  | "expired"
  | "unavailable"
  | "wrongAccount"
  | "forbidden"
  | "generic";

export type AcceptInvitationActionResult =
  | {ok: true; organizationId: string}
  | {ok: false; error: InvitationActionError};

export async function acceptInvitationAction(input: {
  invitationId: string;
}): Promise<AcceptInvitationActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "generic"};

  try {
    const result = await invitationService.acceptInvitation(
      actor,
      parsed.data.invitationId,
      await headers(),
    );

    return {ok: true, organizationId: result.organizationId};
  } catch (error) {
    if (!isDomainError(error)) return {ok: false, error: "generic"};

    switch (error.code) {
      case "INVITATION_EXPIRED":
        return {ok: false, error: "expired"};
      case "INVITATION_NOT_PENDING":
        return {ok: false, error: "unavailable"};
      case "WRONG_ACCOUNT":
        return {ok: false, error: "wrongAccount"};
      case "FORBIDDEN":
        return {ok: false, error: "forbidden"};
      default:
        return {ok: false, error: "generic"};
    }
  }
}
