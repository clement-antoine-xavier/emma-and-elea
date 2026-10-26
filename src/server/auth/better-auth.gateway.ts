import {auth} from "@/lib/auth";
import {DomainError} from "@/server/domain/errors";
import type {OrgRole} from "@/lib/permissions";
import type {OrganizationSummary} from "@/server/repositories/types";

export interface BetterAuthGateway {
  createOrganization(
    input: {name: string; slug: string},
    headers: Headers,
  ): Promise<OrganizationSummary>;

  createInvitation(
    input: {email: string; role: OrgRole; organizationId: string},
    headers: Headers,
  ): Promise<{id: string; email: string; expiresAt: Date}>;

  updateMemberRole(
    input: {memberId: string; role: OrgRole; organizationId: string},
    headers: Headers,
  ): Promise<void>;

  removeMember(
    input: {memberId: string; organizationId: string},
    headers: Headers,
  ): Promise<void>;

  cancelInvitation(invitationId: string, headers: Headers): Promise<void>;

  acceptInvitation(
    invitationId: string,
    headers: Headers,
  ): Promise<{organizationId: string}>;
}

function errorCode(error: unknown): string | undefined {
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

function mapAuthError(error: unknown): DomainError {
  const code = errorCode(error);

  switch (code) {
    case "ORGANIZATION_SLUG_ALREADY_TAKEN":
    case "ORGANIZATION_ALREADY_EXISTS":
      return new DomainError("CONFLICT", code, {cause: error});
    case "USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION":
      return new DomainError("ALREADY_MEMBER", code, {cause: error});
    case "USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION":
      return new DomainError("ALREADY_INVITED", code, {cause: error});
    case "YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER":
    case "YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER":
      return new DomainError("LAST_OWNER", code, {cause: error});
    case "INVITATION_NOT_FOUND":
    case "MEMBER_NOT_FOUND":
    case "ORGANIZATION_NOT_FOUND":
      return new DomainError("NOT_FOUND", code, {cause: error});
    case "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION":
      return new DomainError("WRONG_ACCOUNT", code, {cause: error});
    case "YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION":
    case "YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER":
    case "YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER":
    case "YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION":
    case "YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE":
    case "UNAUTHORIZED":
    case "SESSION_NOT_FOUND":
      return new DomainError("FORBIDDEN", code, {cause: error});
    case "INVALID_EMAIL":
      return new DomainError("INVALID_INPUT", code, {cause: error});
    default:
      return new DomainError("UNEXPECTED", code ?? "AUTH_ERROR", {
        cause: error,
      });
  }
}

async function run<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapAuthError(error);
  }
}

export const betterAuthGateway: BetterAuthGateway = {
  async createOrganization(input, headers) {
    const organization = await run(() =>
      auth.api.createOrganization({body: input, headers}),
    );

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    };
  },

  async createInvitation(input, headers) {
    const invitation = await run(() =>
      auth.api.createInvitation({body: input, headers}),
    );

    return {
      id: invitation.id,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
    };
  },

  async updateMemberRole(input, headers) {
    await run(() =>
      auth.api.updateMemberRole({body: input, headers}),
    );
  },

  async removeMember(input, headers) {
    await run(() =>
      auth.api.removeMember({
        body: {
          memberIdOrEmail: input.memberId,
          organizationId: input.organizationId,
        },
        headers,
      }),
    );
  },

  async cancelInvitation(invitationId, headers) {
    await run(() =>
      auth.api.cancelInvitation({body: {invitationId}, headers}),
    );
  },

  async acceptInvitation(invitationId, headers) {
    const result = await run(() =>
      auth.api.acceptInvitation({body: {invitationId}, headers}),
    );

    return {organizationId: result.member.organizationId};
  },
};
