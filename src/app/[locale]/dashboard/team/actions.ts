"use server";

import {headers} from "next/headers";
import {z} from "zod";
import {auth} from "@/lib/auth";
import {getAccessContext} from "@/lib/access";
import {prisma} from "@/lib/prisma";
import {
  assignableRolesFor,
  can,
  canManageMember,
  isOrgRole,
  isReservedOrgRole,
  type OrgRole,
} from "@/lib/permissions";

export type TeamErrorKey =
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

function apiErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

function mapApiError(error: unknown): TeamErrorKey {
  const code = apiErrorCode(error);

  switch (code) {
    case "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION":
      return "alreadyMember";
    case "USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION":
      return "alreadyInvited";
    case "YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER":
    case "YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER":
      return "lastOwner";
    case "YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER":
    case "YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER":
    case "YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION":
    case "YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION":
      return "forbidden";
    default:
      return "generic";
  }
}

function resolveInviteRole(
  actorRole: string | null,
  role: string,
): TeamErrorKey | null {
  if (!isOrgRole(role) || isReservedOrgRole(role)) return "invalidRole";
  if (!assignableRolesFor(actorRole).includes(role)) return "invalidRole";
  return null;
}

export async function inviteMember(input: {
  email: string;
  role: string;
}): Promise<
  TeamResult<{
    invitation: {id: string; email: string; expiresAt: string};
  }>
> {
  const context = await getAccessContext();

  if (!context?.membership || !context.role) {
    return {ok: false, error: "forbidden"};
  }

  if (!can(context.role, "invitation:create")) {
    return {ok: false, error: "forbidden"};
  }

  const roleError = resolveInviteRole(context.role, input.role);
  if (roleError) return {ok: false, error: roleError};

  const email = input.email.trim().toLowerCase();
  if (!z.email().safeParse(email).success) {
    return {ok: false, error: "invalidEmail"};
  }

  try {
    const invitation = await auth.api.createInvitation({
      body: {
        email,
        role: input.role as OrgRole,
        organizationId: context.membership.organizationId,
      },
      headers: await headers(),
    });

    return {
      ok: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Failed to invite member", error);
    return {ok: false, error: mapApiError(error)};
  }
}

export async function updateMemberRole(input: {
  memberId: string;
  role: string;
}): Promise<TeamResult> {
  const context = await getAccessContext();

  if (!context?.membership || !context.role) {
    return {ok: false, error: "forbidden"};
  }

  if (!can(context.role, "member:update")) {
    return {ok: false, error: "forbidden"};
  }

  const target = await prisma.member.findFirst({
    where: {
      id: input.memberId,
      organizationId: context.membership.organizationId,
    },
    select: {id: true, userId: true, role: true},
  });

  if (!target) return {ok: false, error: "generic"};

  if (!isOrgRole(input.role) || isReservedOrgRole(input.role)) {
    return {ok: false, error: "invalidRole"};
  }

  if (!assignableRolesFor(context.role).includes(input.role)) {
    return {ok: false, error: "invalidRole"};
  }

  if (target.userId === context.user.id) {
    return {ok: false, error: "cannotChangeOwnRole"};
  }

  if (!canManageMember(context.role, target.role, false)) {
    return {ok: false, error: "cannotManageOwner"};
  }

  try {
    await auth.api.updateMemberRole({
      body: {
        memberId: target.id,
        role: input.role as OrgRole,
        organizationId: context.membership.organizationId,
      },
      headers: await headers(),
    });

    return {ok: true};
  } catch (error) {
    console.error("Failed to update member role", error);
    return {ok: false, error: mapApiError(error)};
  }
}

export async function removeMember(input: {
  memberId: string;
}): Promise<TeamResult> {
  const context = await getAccessContext();

  if (!context?.membership || !context.role) {
    return {ok: false, error: "forbidden"};
  }

  if (!can(context.role, "member:delete")) {
    return {ok: false, error: "forbidden"};
  }

  const target = await prisma.member.findFirst({
    where: {
      id: input.memberId,
      organizationId: context.membership.organizationId,
    },
    select: {id: true, userId: true, role: true},
  });

  if (!target) return {ok: false, error: "generic"};

  if (target.userId === context.user.id) {
    return {ok: false, error: "cannotChangeOwnRole"};
  }

  if (!canManageMember(context.role, target.role, false)) {
    return {ok: false, error: "cannotManageOwner"};
  }

  try {
    await auth.api.removeMember({
      body: {
        memberIdOrEmail: target.id,
        organizationId: context.membership.organizationId,
      },
      headers: await headers(),
    });

    return {ok: true};
  } catch (error) {
    console.error("Failed to remove member", error);
    return {ok: false, error: mapApiError(error)};
  }
}

export async function cancelInvitation(input: {
  invitationId: string;
}): Promise<TeamResult> {
  const context = await getAccessContext();

  if (!context?.membership || !context.role) {
    return {ok: false, error: "forbidden"};
  }

  if (!can(context.role, "invitation:cancel")) {
    return {ok: false, error: "forbidden"};
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: input.invitationId,
      organizationId: context.membership.organizationId,
    },
    select: {id: true},
  });

  if (!invitation) return {ok: false, error: "generic"};

  try {
    await auth.api.cancelInvitation({
      body: {invitationId: invitation.id},
      headers: await headers(),
    });

    return {ok: true};
  } catch (error) {
    console.error("Failed to cancel invitation", error);
    return {ok: false, error: mapApiError(error)};
  }
}
