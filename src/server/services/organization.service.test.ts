import {createOrganizationService} from "@/server/services/organization.service";
import {DomainError} from "@/server/domain/errors";
import type {Actor} from "@/server/auth/types";
import type {BetterAuthGateway} from "@/server/auth/better-auth.gateway";
import type {OrganizationBootstrapService} from "@/server/services/organization-bootstrap.service";

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

const input = {
  name: "Bakery",
  slug: "bakery",
  siteName: "Atelier",
  siteCode: "ATL",
};

function makeService() {
  const authGateway: BetterAuthGateway = {
    createOrganization: jest.fn(async (data) => ({
      id: "org_1",
      name: data.name,
      slug: data.slug,
    })),
    createInvitation: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
    cancelInvitation: jest.fn(),
    acceptInvitation: jest.fn(),
  };

  const bootstrapService: OrganizationBootstrapService = {
    bootstrapOrganization: jest.fn().mockResolvedValue(undefined),
  };

  return {
    authGateway,
    bootstrapService,
    service: createOrganizationService({authGateway, bootstrapService}),
    headers: new Headers(),
  };
}

describe("organization service", () => {
  it("creates a workspace and its first site", async () => {
    const deps = makeService();

    const organization = await deps.service.createOrganization(
      actor,
      input,
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
    expect(deps.bootstrapService.bootstrapOrganization).toHaveBeenCalledWith(
      "org_1",
      {
        site: {
          name: "Atelier",
          code: "ATL",
          kind: "WORKSHOP",
          city: null,
          timezone: "Europe/Paris",
        },
      },
    );
  });

  it("requires an authenticated actor", async () => {
    const deps = makeService();

    await expect(
      deps.service.createOrganization(null, input, deps.headers),
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

  it("keeps the workspace when the first-site bootstrap fails", async () => {
    const {service, bootstrapService, headers} = makeService();
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    (bootstrapService.bootstrapOrganization as jest.Mock).mockRejectedValue(
      new Error("settings unavailable"),
    );

    await expect(
      service.createOrganization(actor, input, headers),
    ).resolves.toEqual({id: "org_1", name: "Bakery", slug: "bakery"});
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Failed to create the first site"),
      expect.any(Error),
    );

    consoleError.mockRestore();
  });
});
