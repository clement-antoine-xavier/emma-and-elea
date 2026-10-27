import {auth} from "@/lib/auth";
import {membershipRepository} from "@/server/repositories/membership.repository";
import {actorFor} from "@/test-utils/actor";
import {
  getActorContext,
  hasPermission,
  requireAnyPermission,
  requireOrganizationActor,
  requirePermission,
  requirePlatformSupport,
  requireSession,
} from "@/server/auth/actor";

jest.mock("react", () => {
  const actual = jest.requireActual<typeof import("react")>("react");
  return {...actual, cache: (fn: unknown) => fn};
});

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  notFound: jest.fn(() => {
    throw new Error("not-found");
  }),
}));

jest.mock("@/lib/auth", () => ({
  auth: {api: {getSession: jest.fn()}},
}));

jest.mock("@/server/repositories/membership.repository", () => ({
  membershipRepository: {findMembershipsForUser: jest.fn()},
}));

const getSession = auth.api.getSession as unknown as jest.Mock;
const findMemberships = membershipRepository.findMembershipsForUser as jest.Mock;

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: "member_1",
    organizationId: "org_1",
    role: "owner",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    organization: {id: "org_1", name: "Bakery", slug: "bakery"},
    ...overrides,
  };
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    session: {id: "session_1", activeOrganizationId: "org_1"},
    user: {
      id: "user_1",
      name: "Ada",
      email: "ada@example.com",
      role: "user",
    },
    ...overrides,
  };
}

describe("getActorContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null without a session and skips the membership query", async () => {
    getSession.mockResolvedValue(null);

    await expect(getActorContext()).resolves.toBeNull();
    expect(findMemberships).not.toHaveBeenCalled();
  });

  it("maps the session and the active membership", async () => {
    getSession.mockResolvedValue(session());
    findMemberships.mockResolvedValue([
      membership(),
      membership({id: "member_2", organizationId: "org_2", role: "staff"}),
    ]);

    await expect(getActorContext()).resolves.toEqual({
      userId: "user_1",
      name: "Ada",
      email: "ada@example.com",
      platformRole: "user",
      isSupport: false,
      sessionId: "session_1",
      activeOrganizationId: "org_1",
      membershipId: "member_1",
      organizationId: "org_1",
      organization: {id: "org_1", name: "Bakery", slug: "bakery"},
      role: "owner",
    });
  });

  it("falls back to the oldest membership when the active organization is stale", async () => {
    getSession.mockResolvedValue(
      session({session: {id: "session_1", activeOrganizationId: "org_gone"}}),
    );
    findMemberships.mockResolvedValue([
      membership({id: "member_1", organizationId: "org_1"}),
      membership({id: "member_2", organizationId: "org_2"}),
    ]);

    const actor = await getActorContext();

    expect(actor?.membershipId).toBe("member_1");
    expect(actor?.organizationId).toBe("org_1");
  });

  it("keeps null organization fields for a user without memberships", async () => {
    getSession.mockResolvedValue(
      session({session: {id: "session_1", activeOrganizationId: null}}),
    );
    findMemberships.mockResolvedValue([]);

    const actor = await getActorContext();

    expect(actor?.membershipId).toBeNull();
    expect(actor?.organizationId).toBeNull();
    expect(actor?.organization).toBeNull();
    expect(actor?.role).toBeNull();
  });

  it("fails closed for an unknown stored role", async () => {
    getSession.mockResolvedValue(session());
    findMemberships.mockResolvedValue([membership({role: "member"})]);

    const actor = await getActorContext();

    expect(actor?.role).toBeNull();
    expect(actor?.membershipId).toBe("member_1");
  });

  it("accepts reserved roles and maps the support platform role", async () => {
    getSession.mockResolvedValue(
      session({user: {...session().user, role: "support"}}),
    );
    findMemberships.mockResolvedValue([membership({role: "accountant"})]);

    const actor = await getActorContext();

    expect(actor?.role).toBe("accountant");
    expect(actor?.isSupport).toBe(true);
  });
});

describe("navigation guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requireSession redirects a visitor to sign-in", async () => {
    getSession.mockResolvedValue(null);

    await expect(requireSession()).rejects.toThrow("redirect:/sign-in");
  });

  it("requireSession returns the actor", async () => {
    getSession.mockResolvedValue(session());
    findMemberships.mockResolvedValue([membership()]);

    await expect(requireSession()).resolves.toMatchObject({userId: "user_1"});
  });

  it("requireOrganizationActor sends a memberless user to onboarding", async () => {
    getSession.mockResolvedValue(
      session({session: {id: "session_1", activeOrganizationId: null}}),
    );
    findMemberships.mockResolvedValue([]);

    await expect(requireOrganizationActor()).rejects.toThrow(
      "redirect:/onboarding",
    );
  });

  it("requireOrganizationActor 404s for an unknown role", async () => {
    getSession.mockResolvedValue(session());
    findMemberships.mockResolvedValue([membership({role: "member"})]);

    await expect(requireOrganizationActor()).rejects.toThrow("not-found");
  });

  it("requireOrganizationActor returns a valid member", async () => {
    getSession.mockResolvedValue(session());
    findMemberships.mockResolvedValue([membership()]);

    await expect(requireOrganizationActor()).resolves.toMatchObject({
      organizationId: "org_1",
      role: "owner",
    });
  });

  it("requirePermission 404s when the role lacks the permission", async () => {
    getSession.mockResolvedValue(session());
    findMemberships.mockResolvedValue([membership({role: "staff"})]);

    await expect(requirePermission("cost:read")).rejects.toThrow("not-found");
    await expect(
      requirePermission("production:execute"),
    ).resolves.toMatchObject({role: "staff"});
  });

  it("requireAnyPermission accepts one matching permission", async () => {
    getSession.mockResolvedValue(session());
    findMemberships.mockResolvedValue([membership({role: "sales"})]);

    await expect(
      requireAnyPermission(["cost:read", "order:write"]),
    ).resolves.toMatchObject({role: "sales"});
    await expect(
      requireAnyPermission(["cost:read", "member:update"]),
    ).rejects.toThrow("not-found");
  });

  it("requirePlatformSupport only admits support users", async () => {
    getSession.mockResolvedValue(
      session({user: {...session().user, role: "support"}}),
    );
    findMemberships.mockResolvedValue([]);

    await expect(requirePlatformSupport()).resolves.toMatchObject({
      isSupport: true,
    });

    getSession.mockResolvedValue(session());
    await expect(requirePlatformSupport()).rejects.toThrow("not-found");
  });

  it("hasPermission fails closed outside a session", () => {
    expect(hasPermission(null, "organization:read")).toBe(false);
    expect(hasPermission(actorFor("owner"), "cost:read")).toBe(true);
    expect(hasPermission(actorFor("staff"), "cost:read")).toBe(false);
  });
});
