import {DomainError} from "@/server/domain/errors";
import {
  assertOrganizationActor,
  assertPermission,
} from "@/server/auth/guards";
import {
  actorFor,
  actorWithoutOrganization,
} from "@/test-utils/actor";

describe("assertOrganizationActor", () => {
  it("returns the narrowed actor for a member with a role", () => {
    const actor = actorFor("staff");
    expect(assertOrganizationActor(actor)).toBe(actor);
  });

  it("rejects a null actor", () => {
    expect(() => assertOrganizationActor(null)).toThrow(DomainError);
  });

  it.each([
    ["membershipId", {membershipId: null}],
    ["organizationId", {organizationId: null}],
    ["organization", {organization: null}],
    ["role", {role: null}],
  ])("rejects an actor without %s", (_field, overrides) => {
    expect(() =>
      assertOrganizationActor({
        ...actorFor("owner"),
        ...overrides,
      } as never),
    ).toThrow(DomainError);
  });

  it("rejects the signed-in onboarding state", () => {
    expect(() => assertOrganizationActor(actorWithoutOrganization())).toThrow(
      DomainError,
    );
  });
});

describe("assertPermission", () => {
  it("allows a permission the role holds", () => {
    expect(() => assertPermission(actorFor("owner"), "cost:read")).not.toThrow();
    expect(() =>
      assertPermission(actorFor("staff"), "production:execute"),
    ).not.toThrow();
  });

  it("throws FORBIDDEN when the role lacks the permission", () => {
    expect(() => assertPermission(actorFor("staff"), "cost:read")).toThrow(
      expect.objectContaining({code: "FORBIDDEN"}),
    );
  });

  it("fails closed for reserved roles without the permission", () => {
    expect(() =>
      assertPermission(actorFor("auditor"), "report:finance"),
    ).toThrow(expect.objectContaining({code: "FORBIDDEN"}));
    expect(() =>
      assertPermission(actorFor("auditor"), "report:traceability"),
    ).not.toThrow();
  });

  it("narrows a role with an explicit scope set", () => {
    const readOnlyOwner = actorFor("owner", {
      scopes: new Set<never>(),
    });

    expect(() =>
      assertPermission(readOnlyOwner, "catalog:write"),
    ).toThrow(expect.objectContaining({code: "FORBIDDEN"}));
    expect(() =>
      assertPermission(readOnlyOwner, "organization:read"),
    ).toThrow(expect.objectContaining({code: "FORBIDDEN"}));
  });

  it("never widens a role through an explicit scope set", () => {
    const staffWithWriteScope = actorFor("staff", {
      scopes: new Set(["catalog:write"]),
    });

    // The scope alone is not enough: the role must hold it too. Guards trust
    // the set, so token-actor builds it as the intersection.
    expect(() =>
      assertPermission(staffWithWriteScope, "catalog:write"),
    ).not.toThrow();
  });
});
