import {createTeamService} from "@/server/services/team.service";
import {DomainError} from "@/server/domain/errors";
import type {OrganizationActor} from "@/server/auth/types";
import type {BetterAuthGateway} from "@/server/auth/better-auth.gateway";
import type {MembershipRepository} from "@/server/repositories/membership.repository";
import type {InvitationRepository} from "@/server/repositories/invitation.repository";
import type {OrgRole} from "@/lib/permissions";

function actorFor(role: OrgRole, userId = "user_owner"): OrganizationActor {
  return {
    userId,
    name: "Actor",
    email: `${userId}@example.com`,
    platformRole: "user",
    isSupport: false,
    sessionId: "session_1",
    activeOrganizationId: "org_1",
    membershipId: `member_${userId}`,
    organizationId: "org_1",
    organization: {id: "org_1", name: "Bakery", slug: "bakery"},
    role,
  };
}

function makeDeps() {
  const membershipRepository: MembershipRepository = {
    findMembershipsForUser: jest.fn(async () => []),
    findMemberByIdInOrganization: jest.fn(async () => null),
    listMembers: jest.fn(async () => []),
  };

  const invitationRepository: InvitationRepository = {
    listPending: jest.fn(async () => []),
    findById: jest.fn(async () => null),
    findPendingInOrganization: jest.fn(async () => null),
  };

  const authGateway: BetterAuthGateway = {
    createOrganization: jest.fn(),
    createInvitation: jest.fn(async (input) => ({
      id: "invitation_1",
      email: input.email,
      expiresAt: new Date("2099-11-02T00:00:00.000Z"),
    })),
    updateMemberRole: jest.fn(async () => undefined),
    removeMember: jest.fn(async () => undefined),
    cancelInvitation: jest.fn(async () => undefined),
    acceptInvitation: jest.fn(),
  };

  return {
    membershipRepository,
    invitationRepository,
    authGateway,
    service: createTeamService({
      membershipRepository,
      invitationRepository,
      authGateway,
    }),
    headers: new Headers(),
  };
}

function expectDomainError(
  promise: Promise<unknown>,
  code: DomainError["code"],
) {
  return expect(promise).rejects.toMatchObject({code});
}

describe("team service", () => {
  it("returns members, invitations and assignable roles for a manager", async () => {
    const deps = makeDeps();
    deps.membershipRepository.listMembers = jest.fn(async () => [
      {
        id: "member_1",
        userId: "user_owner",
        name: "Owner",
        email: "owner@example.com",
        role: "owner",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    deps.invitationRepository.listPending = jest.fn(async () => [
      {
        id: "invitation_1",
        email: "staff@example.com",
        role: "staff",
        expiresAt: new Date("2099-11-02T00:00:00.000Z"),
      },
    ]);

    const view = await deps.service.getTeamView(actorFor("owner"));

    expect(view.members).toHaveLength(1);
    expect(view.invitations).toHaveLength(1);
    expect(view.assignableRoles).toContain("owner");
    expect(view.currentUserId).toBe("user_owner");
  });

  it("denies team data to roles without member:read", async () => {
    const deps = makeDeps();

    await expectDomainError(
      deps.service.getTeamView(actorFor("staff")),
      "FORBIDDEN",
    );
    expect(deps.membershipRepository.listMembers).not.toHaveBeenCalled();
  });

  it("lets an owner invite a staff member", async () => {
    const deps = makeDeps();

    const invitation = await deps.service.inviteMember(
      actorFor("owner"),
      {email: "staff@example.com", role: "staff"},
      deps.headers,
    );

    expect(invitation.id).toBe("invitation_1");
    expect(deps.authGateway.createInvitation).toHaveBeenCalledWith(
      {
        email: "staff@example.com",
        role: "staff",
        organizationId: "org_1",
      },
      deps.headers,
    );
  });

  it("stops an admin from inviting or managing an owner", async () => {
    const deps = makeDeps();
    deps.membershipRepository.findMemberByIdInOrganization = jest.fn(
      async () => ({id: "member_owner", userId: "user_owner", role: "owner"}),
    );

    await expectDomainError(
      deps.service.inviteMember(
        actorFor("admin", "user_admin"),
        {email: "new@example.com", role: "owner"},
        deps.headers,
      ),
      "INVALID_ROLE",
    );

    await expectDomainError(
      deps.service.updateMemberRole(
        actorFor("admin", "user_admin"),
        {memberId: "member_owner", role: "staff"},
        deps.headers,
      ),
      "CANNOT_MANAGE_OWNER",
    );
  });

  it("rejects reserved and unknown roles", async () => {
    const deps = makeDeps();

    for (const role of ["accountant", "auditor", "member", "superuser"]) {
      await expectDomainError(
        deps.service.inviteMember(
          actorFor("owner"),
          {email: "new@example.com", role},
          deps.headers,
        ),
        "INVALID_ROLE",
      );
    }
  });

  it("prevents changing your own role", async () => {
    const deps = makeDeps();
    deps.membershipRepository.findMemberByIdInOrganization = jest.fn(
      async () => ({id: "member_1", userId: "user_owner", role: "owner"}),
    );

    await expectDomainError(
      deps.service.updateMemberRole(
        actorFor("owner"),
        {memberId: "member_1", role: "admin"},
        deps.headers,
      ),
      "CANNOT_CHANGE_OWN_ROLE",
    );
    expect(deps.authGateway.updateMemberRole).not.toHaveBeenCalled();
  });

  it("does not touch a member from another organization", async () => {
    const deps = makeDeps();

    await expectDomainError(
      deps.service.removeMember(
        actorFor("owner"),
        {memberId: "member_other_org"},
        deps.headers,
      ),
      "NOT_FOUND",
    );
    expect(deps.authGateway.removeMember).not.toHaveBeenCalled();
  });

  it("only cancels invitations from the actor organization", async () => {
    const deps = makeDeps();

    await expectDomainError(
      deps.service.cancelInvitation(
        actorFor("owner"),
        {invitationId: "invitation_other_org"},
        deps.headers,
      ),
      "NOT_FOUND",
    );

    deps.invitationRepository.findPendingInOrganization = jest.fn(
      async () => ({id: "invitation_1"}),
    );

    await deps.service.cancelInvitation(
      actorFor("owner"),
      {invitationId: "invitation_1"},
      deps.headers,
    );
    expect(deps.authGateway.cancelInvitation).toHaveBeenCalledWith(
      "invitation_1",
      deps.headers,
    );
  });

  it("denies invitations to roles without invitation:create", async () => {
    const deps = makeDeps();

    await expectDomainError(
      deps.service.inviteMember(
        actorFor("production_manager"),
        {email: "new@example.com", role: "staff"},
        deps.headers,
      ),
      "FORBIDDEN",
    );
  });
});
