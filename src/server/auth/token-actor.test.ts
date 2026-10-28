import {TOKEN_ORG_CLAIM} from "@/lib/scopes";
import {membershipRepository} from "@/server/repositories/membership.repository";
import {
  resolveTokenActor,
  scopesFromClaim,
  type TokenClaims,
} from "@/server/auth/token-actor";

jest.mock("@/server/repositories/membership.repository", () => ({
  membershipRepository: {findMembershipForUserInOrganization: jest.fn()},
}));

const findMembership =
  membershipRepository.findMembershipForUserInOrganization as jest.Mock;

function claims(overrides: TokenClaims = {}): TokenClaims {
  return {
    sub: "user_1",
    [TOKEN_ORG_CLAIM]: "org_1",
    scope: "api:read",
    ...overrides,
  };
}

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: "member_1",
    organizationId: "org_1",
    role: "owner",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    organization: {id: "org_1", name: "Bakery", slug: "bakery"},
    user: {name: "Ada", email: "ada@example.com", role: "user"},
    ...overrides,
  };
}

describe("scopesFromClaim", () => {
  it("splits the space-separated scope claim", () => {
    expect(scopesFromClaim("api:read api:write")).toEqual([
      "api:read",
      "api:write",
    ]);
    expect(scopesFromClaim(undefined)).toEqual([]);
  });
});

describe("resolveTokenActor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires a subject", async () => {
    await expect(resolveTokenActor(claims({sub: undefined}))).rejects.toThrow(
      expect.objectContaining({code: "FORBIDDEN", message: "TOKEN_USER_REQUIRED"}),
    );
  });

  it("requires the consent-bound organization claim", async () => {
    await expect(
      resolveTokenActor(claims({[TOKEN_ORG_CLAIM]: undefined})),
    ).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: "TOKEN_ORGANIZATION_REQUIRED",
      }),
    );
  });

  it("rejects a user who is not a member of that organization", async () => {
    findMembership.mockResolvedValue(null);

    await expect(resolveTokenActor(claims())).rejects.toThrow(
      expect.objectContaining({message: "TOKEN_MEMBERSHIP_REQUIRED"}),
    );
  });

  it("rejects an unknown stored role", async () => {
    findMembership.mockResolvedValue(membership({role: "superuser"}));

    await expect(resolveTokenActor(claims())).rejects.toThrow(
      expect.objectContaining({message: "TOKEN_UNKNOWN_ROLE"}),
    );
  });

  it("intersects token scopes with the current role", async () => {
    findMembership.mockResolvedValue(membership({role: "staff"}));

    const actor = await resolveTokenActor(
      claims({scope: "api:read api:write api:finance"}),
    );

    expect(actor.organizationId).toBe("org_1");
    expect(actor.role).toBe("staff");
    expect(actor.scopes?.has("catalog:read")).toBe(true);
    expect(actor.scopes?.has("waste:write")).toBe(true);
    // Finance is requested but the staff role cannot exercise it.
    expect(actor.scopes?.has("cost:read")).toBe(false);
  });

  it("never grants a permission the role lacks", async () => {
    findMembership.mockResolvedValue(membership({role: "sales"}));

    const actor = await resolveTokenActor(claims({scope: "api:write"}));

    expect(actor.scopes?.has("catalog:write")).toBe(false);
    expect(actor.scopes?.has("order:write")).toBe(true);
  });
});
