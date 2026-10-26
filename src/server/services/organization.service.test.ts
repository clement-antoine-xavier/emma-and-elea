import {createOrganizationService} from "@/server/services/organization.service";
import {DomainError} from "@/server/domain/errors";
import type {Actor} from "@/server/auth/types";
import type {BetterAuthGateway} from "@/server/auth/better-auth.gateway";

const actor: Actor = {
  userId: "user_1",
  name: "Owner",
  email: "owner@example.com",
  platformRole: "user",
  isSupport: false,
  sessionId: "session_1",
  activeOrganizationId: null,
  membershipId: null,
  organizationId: null,
  organization: null,
  role: null,
};

function makeService() {
  const authGateway: BetterAuthGateway = {
    createOrganization: jest.fn(async (input) => ({
      id: "org_1",
      name: input.name,
      slug: input.slug,
    })),
    createInvitation: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
    cancelInvitation: jest.fn(),
    acceptInvitation: jest.fn(),
  };

  return {
    authGateway,
    service: createOrganizationService({authGateway}),
    headers: new Headers(),
  };
}

describe("organization service", () => {
  it("creates a workspace through the auth gateway", async () => {
    const deps = makeService();

    const organization = await deps.service.createOrganization(
      actor,
      {name: "Bakery", slug: "bakery"},
      deps.headers,
    );

    expect(organization).toEqual({
      id: "org_1",
      name: "Bakery",
      slug: "bakery",
    });
    expect(deps.authGateway.createOrganization).toHaveBeenCalledWith(
      {name: "Bakery", slug: "bakery"},
      deps.headers,
    );
  });

  it("requires an authenticated actor", async () => {
    const deps = makeService();

    await expect(
      deps.service.createOrganization(
        null,
        {name: "Bakery", slug: "bakery"},
        deps.headers,
      ),
    ).rejects.toBeInstanceOf(DomainError);
    expect(deps.authGateway.createOrganization).not.toHaveBeenCalled();
  });

  it("reports whether onboarding is still required", () => {
    const deps = makeService();

    expect(deps.service.getOnboardingState(actor)).toEqual({
      hasOrganization: false,
    });
    expect(
      deps.service.getOnboardingState({
        ...actor,
        organizationId: "org_1",
      }),
    ).toEqual({hasOrganization: true});
  });
});
