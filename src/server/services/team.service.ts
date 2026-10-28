import {
  assignableRolesFor,
  canManageMember,
  isOrgRole,
  isReservedOrgRole,
  type OrgRole,
  type Permission,
} from "@/lib/permissions";
import {assertOrganizationActor, isGranted} from "@/server/auth/guards";
import type {Actor, OrganizationActor} from "@/server/auth/types";
import type {BetterAuthGateway} from "@/server/auth/better-auth.gateway";
import {DomainError} from "@/server/domain/errors";
import type {MembershipRepository} from "@/server/repositories/membership.repository";
import type {InvitationRepository} from "@/server/repositories/invitation.repository";
import type {
  PendingInvitationRecord,
  TeamMemberRecord,
} from "@/server/repositories/types";

export type TeamView = {
  members: TeamMemberRecord[];
  invitations: PendingInvitationRecord[];
  assignableRoles: OrgRole[];
  actorRole: OrgRole;
  currentUserId: string;
};

export type CreatedInvitation = {
  id: string;
  email: string;
  expiresAt: Date;
};

export interface TeamService {
  getTeamView(actor: Actor | null): Promise<TeamView>;
  inviteMember(
    actor: Actor | null,
    input: {email: string; role: string},
    headers: Headers,
  ): Promise<CreatedInvitation>;
  updateMemberRole(
    actor: Actor | null,
    input: {memberId: string; role: string},
    headers: Headers,
  ): Promise<void>;
  removeMember(
    actor: Actor | null,
    input: {memberId: string},
    headers: Headers,
  ): Promise<void>;
  cancelInvitation(
    actor: Actor | null,
    input: {invitationId: string},
    headers: Headers,
  ): Promise<void>;
}

function requirePermission(
  actor: OrganizationActor,
  permission: Permission,
): void {
  if (!isGranted(actor, permission)) throw new DomainError("FORBIDDEN");
}

function assertAssignableRole(actor: OrganizationActor, role: string): OrgRole {
  if (
    !isOrgRole(role) ||
    isReservedOrgRole(role) ||
    !assignableRolesFor(actor.role).includes(role)
  ) {
    throw new DomainError("INVALID_ROLE");
  }

  return role;
}

export function createTeamService(deps: {
  membershipRepository: MembershipRepository;
  invitationRepository: InvitationRepository;
  authGateway: BetterAuthGateway;
}): TeamService {
  async function findTarget(
    actor: OrganizationActor,
    memberId: string,
  ): Promise<{id: string; userId: string; role: string}> {
    const target = await deps.membershipRepository.findMemberByIdInOrganization(
      memberId,
      actor.organizationId,
    );

    if (!target) throw new DomainError("NOT_FOUND");

    return target;
  }

  function assertCanManageTarget(
    actor: OrganizationActor,
    target: {userId: string; role: string},
  ): void {
    if (target.userId === actor.userId) {
      throw new DomainError("CANNOT_CHANGE_OWN_ROLE");
    }

    if (!canManageMember(actor.role, target.role, false)) {
      throw new DomainError(
        target.role === "owner" ? "CANNOT_MANAGE_OWNER" : "FORBIDDEN",
      );
    }
  }

  return {
    async getTeamView(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      requirePermission(actor, "member:read");

      const [members, invitations] = await Promise.all([
        deps.membershipRepository.listMembers(actor.organizationId),
        deps.invitationRepository.listPending(
          actor.organizationId,
          new Date(),
        ),
      ]);

      return {
        members,
        invitations,
        assignableRoles: assignableRolesFor(actor.role),
        actorRole: actor.role,
        currentUserId: actor.userId,
      };
    },

    async inviteMember(actorInput, input, headers) {
      const actor = assertOrganizationActor(actorInput);
      requirePermission(actor, "invitation:create");

      const role = assertAssignableRole(actor, input.role);

      return deps.authGateway.createInvitation(
        {
          email: input.email,
          role,
          organizationId: actor.organizationId,
        },
        headers,
      );
    },

    async updateMemberRole(actorInput, input, headers) {
      const actor = assertOrganizationActor(actorInput);
      requirePermission(actor, "member:update");

      const role = assertAssignableRole(actor, input.role);
      const target = await findTarget(actor, input.memberId);
      assertCanManageTarget(actor, target);

      await deps.authGateway.updateMemberRole(
        {
          memberId: target.id,
          role,
          organizationId: actor.organizationId,
        },
        headers,
      );
    },

    async removeMember(actorInput, input, headers) {
      const actor = assertOrganizationActor(actorInput);
      requirePermission(actor, "member:delete");

      const target = await findTarget(actor, input.memberId);
      assertCanManageTarget(actor, target);

      await deps.authGateway.removeMember(
        {memberId: target.id, organizationId: actor.organizationId},
        headers,
      );
    },

    async cancelInvitation(actorInput, input, headers) {
      const actor = assertOrganizationActor(actorInput);
      requirePermission(actor, "invitation:cancel");

      const invitation = await deps.invitationRepository.findPendingInOrganization(
        input.invitationId,
        actor.organizationId,
      );

      if (!invitation) throw new DomainError("NOT_FOUND");

      await deps.authGateway.cancelInvitation(invitation.id, headers);
    },
  };
}
