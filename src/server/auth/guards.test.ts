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
});
