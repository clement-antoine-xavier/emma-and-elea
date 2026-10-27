import {betterAuthGateway} from "@/server/auth/better-auth.gateway";
import {DomainError} from "@/server/domain/errors";

jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      createOrganization: jest.fn(),
      createInvitation: jest.fn(),
      updateMemberRole: jest.fn(),
      removeMember: jest.fn(),
      cancelInvitation: jest.fn(),
      acceptInvitation: jest.fn(),
    },
  },
}));

const {auth} = jest.requireMock("@/lib/auth") as {
  auth: {api: Record<string, jest.Mock>};
};

const headers = new Headers({"x-test": "1"});

function authError(code: string) {
  return Object.assign(new Error(code), {code});
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createOrganization", () => {
  it("returns a plain organization summary", async () => {
    auth.api.createOrganization.mockResolvedValue({
      id: "org_1",
      name: "Bakery",
      slug: "bakery",
      extra: "ignored",
    });

    await expect(
      betterAuthGateway.createOrganization(
        {name: "Bakery", slug: "bakery"},
        headers,
      ),
    ).resolves.toEqual({id: "org_1", name: "Bakery", slug: "bakery"});
    expect(auth.api.createOrganization).toHaveBeenCalledWith({
      body: {name: "Bakery", slug: "bakery"},
      headers,
    });
  });

  it.each([
    ["ORGANIZATION_SLUG_ALREADY_TAKEN", "CONFLICT"],
    ["ORGANIZATION_ALREADY_EXISTS", "CONFLICT"],
    ["USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION", "ALREADY_MEMBER"],
    ["USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION", "ALREADY_INVITED"],
    ["YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER", "LAST_OWNER"],
    ["INVITATION_NOT_FOUND", "NOT_FOUND"],
    ["YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION", "WRONG_ACCOUNT"],
    ["UNAUTHORIZED", "FORBIDDEN"],
    ["INVALID_EMAIL", "INVALID_INPUT"],
  ])("maps %s to %s", async (authCode, domainCode) => {
    auth.api.createOrganization.mockRejectedValue(authError(authCode));

    await expect(
      betterAuthGateway.createOrganization(
        {name: "Bakery", slug: "bakery"},
        headers,
      ),
    ).rejects.toMatchObject({code: domainCode});
  });

  it("maps an unknown error to UNEXPECTED and keeps the cause", async () => {
    const original = authError("SOMETHING_NEW");
    auth.api.createOrganization.mockRejectedValue(original);

    const error = await betterAuthGateway
      .createOrganization({name: "Bakery", slug: "bakery"}, headers)
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({code: "UNEXPECTED"});
    expect((error as Error).cause).toBe(original);
  });

  it("handles a non-object failure without a code", async () => {
    auth.api.createOrganization.mockRejectedValue("boom");

    await expect(
      betterAuthGateway.createOrganization(
        {name: "Bakery", slug: "bakery"},
        headers,
      ),
    ).rejects.toMatchObject({code: "UNEXPECTED"});
  });
});

describe("member and invitation operations", () => {
  it("creates an invitation with the parsed role", async () => {
    const expiresAt = new Date("2026-11-01T00:00:00.000Z");
    auth.api.createInvitation.mockResolvedValue({
      id: "inv_1",
      email: "ada@example.com",
      expiresAt,
      ignored: true,
    });

    await expect(
      betterAuthGateway.createInvitation(
        {
          email: "ada@example.com",
          role: "staff",
          organizationId: "org_1",
        },
        headers,
      ),
    ).resolves.toEqual({
      id: "inv_1",
      email: "ada@example.com",
      expiresAt,
    });
  });

  it("passes the member id and organization to removeMember", async () => {
    auth.api.removeMember.mockResolvedValue({});

    await betterAuthGateway.removeMember(
      {memberId: "member_1", organizationId: "org_1"},
      headers,
    );

    expect(auth.api.removeMember).toHaveBeenCalledWith({
      body: {memberIdOrEmail: "member_1", organizationId: "org_1"},
      headers,
    });
  });

  it("updates a member role and cancels an invitation", async () => {
    auth.api.updateMemberRole.mockResolvedValue({});
    auth.api.cancelInvitation.mockResolvedValue({});

    await betterAuthGateway.updateMemberRole(
      {memberId: "member_1", role: "sales", organizationId: "org_1"},
      headers,
    );
    await betterAuthGateway.cancelInvitation("inv_1", headers);

    expect(auth.api.updateMemberRole).toHaveBeenCalledWith({
      body: {memberId: "member_1", role: "sales", organizationId: "org_1"},
      headers,
    });
    expect(auth.api.cancelInvitation).toHaveBeenCalledWith({
      body: {invitationId: "inv_1"},
      headers,
    });
  });

  it("returns the organization id when an invitation is accepted", async () => {
    auth.api.acceptInvitation.mockResolvedValue({
      member: {organizationId: "org_1"},
    });

    await expect(
      betterAuthGateway.acceptInvitation("inv_1", headers),
    ).resolves.toEqual({organizationId: "org_1"});
  });

  it("maps forbidden member operations", async () => {
    auth.api.removeMember.mockRejectedValue(
      authError("YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER"),
    );

    await expect(
      betterAuthGateway.removeMember(
        {memberId: "member_1", organizationId: "org_1"},
        headers,
      ),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});
