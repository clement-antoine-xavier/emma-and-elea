"use server";

import {headers} from "next/headers";
import {getActorContext} from "@/server/auth/actor";
import {isDomainError} from "@/server/domain/errors";
import {teamService} from "@/server/services/container";
import {
  invitationIdSchema,
  inviteMemberSchema,
  memberIdSchema,
  updateMemberRoleSchema,
} from "@/server/validators/team.schema";

export type TeamErrorKey =
  | "unauthenticated"
  | "forbidden"
  | "cannotManageOwner"
  | "cannotChangeOwnRole"
  | "invalidRole"
  | "lastOwner"
  | "invalidEmail"
  | "alreadyMember"
  | "alreadyInvited"
  | "generic";

type TeamResult<T extends object = object> =
  | ({ok: true} & T)
  | {ok: false; error: TeamErrorKey};

function mapDomainError(error: unknown): TeamErrorKey {
  if (!isDomainError(error)) return "generic";

  switch (error.code) {
    case "FORBIDDEN":
      return "forbidden";
    case "CANNOT_MANAGE_OWNER":
      return "cannotManageOwner";
    case "CANNOT_CHANGE_OWN_ROLE":
      return "cannotChangeOwnRole";
    case "INVALID_ROLE":
      return "invalidRole";
    case "LAST_OWNER":
      return "lastOwner";
    case "ALREADY_MEMBER":
      return "alreadyMember";
    case "ALREADY_INVITED":
      return "alreadyInvited";
    case "INVALID_INPUT":
      return "invalidEmail";
    default:
      return "generic";
  }
}

export async function inviteMemberAction(input: {
  email: string;
  role: string;
}): Promise<
  TeamResult<{
    invitation: {id: string; email: string; expiresAt: string};
  }>
> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = inviteMemberSchema((key) => key).safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.path[0] === "email"
          ? "invalidEmail"
          : "invalidRole",
    };
  }

  try {
    const invitation = await teamService.inviteMember(
      actor,
      parsed.data,
      await headers(),
    );

    return {
      ok: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    };
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function updateMemberRoleAction(input: {
  memberId: string;
  role: string;
}): Promise<TeamResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = updateMemberRoleSchema((key) => key).safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.path[0] === "role"
          ? "invalidRole"
          : "generic",
    };
  }

  try {
    await teamService.updateMemberRole(actor, parsed.data, await headers());
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removeMemberAction(input: {
  memberId: string;
}): Promise<TeamResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = memberIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "generic"};

  try {
    await teamService.removeMember(actor, parsed.data, await headers());
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function cancelInvitationAction(input: {
  invitationId: string;
}): Promise<TeamResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = invitationIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "generic"};

  try {
    await teamService.cancelInvitation(actor, parsed.data, await headers());
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
