import {
  ALL_ORG_ROLES,
  RESERVED_ORG_ROLES,
  canAny,
  isOrgRole,
  isPlatformRole,
  isReservedOrgRole,
  permissionsFor,
} from "@/lib/permissions";

describe("permission helpers", () => {
  it("recognizes reserved and platform roles", () => {
    for (const role of RESERVED_ORG_ROLES) {
      expect(isReservedOrgRole(role)).toBe(true);
      expect(isOrgRole(role)).toBe(true);
    }

    expect(isReservedOrgRole("owner")).toBe(false);
    expect(isReservedOrgRole(null)).toBe(false);
    expect(isPlatformRole("support")).toBe(true);
    expect(isPlatformRole("user")).toBe(true);
    expect(isPlatformRole("owner")).toBe(false);
    expect(isPlatformRole(undefined)).toBe(false);
  });

  it("splits canAny on any matching permission", () => {
    expect(canAny("staff", ["team:read", "production:execute"])).toBe(true);
    expect(canAny("staff", ["team:read", "cost:read"])).toBe(false);
    expect(canAny(null, ["organization:read"])).toBe(false);
    expect(canAny("owner", [])).toBe(false);
  });

  it("returns a copy of the role permissions", () => {
    const first = permissionsFor("staff");
    first.push("cost:read");

    expect(permissionsFor("staff")).not.toContain("cost:read");
  });

  it("keeps the reserved roles read-only", () => {
    for (const role of RESERVED_ORG_ROLES) {
      expect(permissionsFor(role).some((p) => p.endsWith(":write"))).toBe(
        false,
      );
    }
  });

  it("covers every declared role", () => {
    expect(ALL_ORG_ROLES).toContain("owner");
    expect(ALL_ORG_ROLES).toContain("staff");
    expect(new Set(ALL_ORG_ROLES).size).toBe(ALL_ORG_ROLES.length);
  });
});
