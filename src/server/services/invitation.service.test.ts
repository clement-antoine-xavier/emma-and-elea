import {createInvitationService} from "@/server/services/invitation.service";
import {DomainError} from "@/server/domain/errors";
import type {Actor} from "@/server/auth/types";
import type {BetterAuthGateway} from "@/server/auth/better-auth.gateway";
import type {InvitationRepository} from "@/server/repositories/invitation.repository";
import type {InvitationDetailRecord} from "@/server/repositories/types";

const invitation: InvitationDetailRecord = {
  id: "invitation_1",
  email: "staff@example.com",
  role: "staff",
  status: "pending",
  expiresAt: new Date("2099-11-02T00:00:00.000Z"),
  organization: {id: "org_1", name: "Bakery", slug: "bakery"},
  inviter: {name: "Owner", email: "owner@example.com"},
};

function actorFor(email: string): Actor {
  return {
    userId: "user_1",
    name: "Staff",
    email,
    platformRole: "user",
    isSupport: false,
    sessionId: "session_1",
    activeOrganizationId: null,
    membershipId: null,
    organizationId: null,
    organization: null,
    role: null,
  };
}

function makeDeps(overrides?: Partial<InvitationDetailRecord>) {
  const invitationRepository: InvitationRepository = {
    listPending: jest.fn(async () => []),
    findById: jest.fn(async () => ({...invitation, ...overrides})),
    findPendingInOrganization: jest.fn(async () => null),
  };

  const authGateway: BetterAuthGateway = {
    createOrganization: jest.fn(),
    createInvitation: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
    cancelInvitation: jest.fn(),
    acceptInvitation: jest.fn(async () => ({organizationId: "org_1"})),
  };

  return {
    invitationRepository,
    authGateway,
    service: createInvitationService({invitationRepository, authGateway}),
    headers: new Headers(),
  };
}

function expectDomainError(
  promise: Promise<unknown>,
  code: DomainError["code"],
) {
  return expect(promise).rejects.toMatchObject({code});
}

describe("invitation service", () => {
  it("returns null for an unknown invitation", async () => {
    const deps = makeDeps();
    deps.invitationRepository.findById = jest.fn(async () => null);

    await expect(
      deps.service.getInvitationView(null, "missing"),
    ).resolves.toBeNull();
  });

  it("marks a pending invitation for the right recipient", async () => {
    const deps = makeDeps();

    const view = await deps.service.getInvitationView(
      actorFor("staff@example.com"),
      "invitation_1",
    );

    expect(view?.state).toBe("pending");
  });

  it("asks an anonymous visitor to sign in", async () => {
    const deps = makeDeps();

    const view = await deps.service.getInvitationView(null, "invitation_1");

    expect(view?.state).toBe("unauthenticated");
  });

  it("rejects a different signed-in account", async () => {
    const deps = makeDeps();

    const view = await deps.service.getInvitationView(
      actorFor("other@example.com"),
      "invitation_1",
    );

    expect(view?.state).toBe("wrong-account");
  });

  it("reports accepted, unavailable and expired invitations", async () => {
    const accepted = makeDeps({status: "accepted"});
    const unavailable = makeDeps({status: "cancelled"});
    const expired = makeDeps({
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    await expect(
      accepted.service.getInvitationView(null, "invitation_1"),
    ).resolves.toMatchObject({state: "accepted"});
    await expect(
      unavailable.service.getInvitationView(null, "invitation_1"),
    ).resolves.toMatchObject({state: "unavailable"});
    await expect(
      expired.service.getInvitationView(null, "invitation_1"),
    ).resolves.toMatchObject({state: "expired"});
  });

  it("accepts a valid invitation and returns the organization", async () => {
    const deps = makeDeps();

    const result = await deps.service.acceptInvitation(
      actorFor("staff@example.com"),
      "invitation_1",
      deps.headers,
    );

    expect(result).toEqual({organizationId: "org_1"});
    expect(deps.authGateway.acceptInvitation).toHaveBeenCalledWith(
      "invitation_1",
      deps.headers,
    );
  });

  it("refuses expired, unavailable and misaddressed invitations", async () => {
    const expired = makeDeps({
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });
    const accepted = makeDeps({status: "accepted"});

    await expectDomainError(
      expired.service.acceptInvitation(
        actorFor("staff@example.com"),
        "invitation_1",
        expired.headers,
      ),
      "INVITATION_EXPIRED",
    );
    await expectDomainError(
      accepted.service.acceptInvitation(
        actorFor("staff@example.com"),
        "invitation_1",
        accepted.headers,
      ),
      "INVITATION_NOT_PENDING",
    );
    await expectDomainError(
      accepted.service.acceptInvitation(
        actorFor("other@example.com"),
        "invitation_1",
        accepted.headers,
      ),
      "INVITATION_NOT_PENDING",
    );

    const pending = makeDeps();
    await expectDomainError(
      pending.service.acceptInvitation(
        actorFor("other@example.com"),
        "invitation_1",
        pending.headers,
      ),
      "WRONG_ACCOUNT",
    );
  });
});
