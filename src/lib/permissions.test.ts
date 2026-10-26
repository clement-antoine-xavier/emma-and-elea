import {
  ALL_ORG_ROLES,
  ORG_ROLES,
  RESERVED_ORG_ROLES,
  assignableRolesFor,
  can,
  canManageMember,
  isOrgRole,
  isPlatformSupport,
  permissionsFor,
} from "@/lib/permissions";

describe("organization permissions", () => {
  it("keeps every declared permission valid", () => {
    for (const role of ALL_ORG_ROLES) {
      for (const permission of permissionsFor(role)) {
        expect(permission).toMatch(/^[a-z]+:[a-zA-Z]+$/);
      }
    }
  });

  it("gives the owner every permission, including organization deletion", () => {
    expect(can("owner", "organization:delete")).toBe(true);
    expect(can("owner", "member:update")).toBe(true);
    expect(can("owner", "cost:read")).toBe(true);
    expect(can("owner", "invitation:create")).toBe(true);
  });

  it("lets admins run the business but not delete the organization", () => {
    expect(can("admin", "organization:update")).toBe(true);
    expect(can("admin", "organization:delete")).toBe(false);
    expect(can("admin", "member:update")).toBe(true);
    expect(can("admin", "invitation:create")).toBe(true);
    expect(can("admin", "cost:read")).toBe(true);
  });

  it("gives the production manager costs, production and team decisions", () => {
    expect(can("production_manager", "recipe:write")).toBe(true);
    expect(can("production_manager", "cost:read")).toBe(true);
    expect(can("production_manager", "production:write")).toBe(true);
    expect(can("production_manager", "team:write")).toBe(true);
    expect(can("production_manager", "absence:decide")).toBe(true);
    expect(can("production_manager", "member:update")).toBe(false);
  });

  it("lets stock buy and count without seeing costs", () => {
    expect(can("stock_manager", "purchasing:write")).toBe(true);
    expect(can("stock_manager", "supplier:write")).toBe(true);
    expect(can("stock_manager", "stock:count")).toBe(true);
    expect(can("stock_manager", "recipe:read")).toBe(true);
    expect(can("stock_manager", "cost:read")).toBe(false);
    expect(can("stock_manager", "report:finance")).toBe(false);
  });

  it("keeps sales commercial but away from costs", () => {
    expect(can("sales", "order:write")).toBe(true);
    expect(can("sales", "customer:write")).toBe(true);
    expect(can("sales", "dispatch:write")).toBe(true);
    expect(can("sales", "sales:write")).toBe(true);
    expect(can("sales", "cost:read")).toBe(false);
    expect(can("sales", "recipe:write")).toBe(false);
  });

  it("keeps staff to their own work and sale prices", () => {
    expect(can("staff", "production:execute")).toBe(true);
    expect(can("staff", "task:execute")).toBe(true);
    expect(can("staff", "waste:write")).toBe(true);
    expect(can("staff", "stock:count")).toBe(true);
    expect(can("staff", "team:self")).toBe(true);
    expect(can("staff", "team:read")).toBe(false);
    expect(can("staff", "cost:read")).toBe(false);
    expect(can("staff", "member:read")).toBe(false);
    expect(can("staff", "order:read")).toBe(false);
  });

  it("reserves accountant and auditor without write access", () => {
    expect(can("accountant", "cost:read")).toBe(true);
    expect(can("accountant", "report:finance")).toBe(true);
    expect(can("accountant", "production:write")).toBe(false);
    expect(can("accountant", "member:update")).toBe(false);

    expect(can("auditor", "report:traceability")).toBe(true);
    expect(can("auditor", "stock:read")).toBe(true);
    expect(can("auditor", "cost:read")).toBe(false);
    expect(can("auditor", "report:finance")).toBe(false);
    expect(can("auditor", "production:write")).toBe(false);
  });

  it("fails closed for unknown or missing roles", () => {
    expect(can(null, "organization:read")).toBe(false);
    expect(can(undefined, "organization:read")).toBe(false);
    expect(can("member", "organization:read")).toBe(false);
    expect(can("superuser", "cost:read")).toBe(false);
    expect(permissionsFor("member")).toEqual([]);
    expect(isOrgRole("member")).toBe(false);
  });

  it("keeps Better Auth's own permissions on owner and admin", () => {
    for (const role of ["owner", "admin"] as const) {
      expect(can(role, "invitation:create")).toBe(true);
      expect(can(role, "invitation:cancel")).toBe(true);
      expect(can(role, "member:update")).toBe(true);
      expect(can(role, "member:delete")).toBe(true);
    }
  });

  it("builds the invitation picker from active roles only", () => {
    expect(assignableRolesFor("owner")).toEqual([...ORG_ROLES]);
    expect(assignableRolesFor("admin")).toEqual(
      ORG_ROLES.filter((role) => role !== "owner"),
    );
    expect(assignableRolesFor("production_manager")).toEqual([]);
    expect(assignableRolesFor(null)).toEqual([]);

    for (const reserved of RESERVED_ORG_ROLES) {
      expect(assignableRolesFor("owner")).not.toContain(reserved);
    }
  });

  it("stops admins from touching owners and everyone from editing themselves", () => {
    expect(canManageMember("owner", "owner", false)).toBe(true);
    expect(canManageMember("owner", "admin", false)).toBe(true);
    expect(canManageMember("admin", "admin", false)).toBe(true);
    expect(canManageMember("admin", "owner", false)).toBe(false);
    expect(canManageMember("production_manager", "staff", false)).toBe(false);
    expect(canManageMember("owner", "admin", true)).toBe(false);
    expect(canManageMember("admin", "staff", true)).toBe(false);
  });

  it("recognizes platform support with its legacy alias", () => {
    expect(isPlatformSupport("support")).toBe(true);
    expect(isPlatformSupport("admin")).toBe(true);
    expect(isPlatformSupport("user")).toBe(false);
    expect(isPlatformSupport(null)).toBe(false);
  });
});
