import {ALL_ORG_ROLES, ROLE_PERMISSIONS} from "@/lib/permissions";
import {ac, roles} from "@/server/auth/permissions";

describe("Better Auth roles mirror the shared matrix", () => {
  it("declares the same resources as the app", () => {
    expect(Object.keys(ac.statements)).toEqual(
      expect.arrayContaining([
        "organization",
        "member",
        "invitation",
        "team",
        "catalog",
        "stock",
        "report",
      ]),
    );
  });

  it("creates a role for every declared role", () => {
    expect(Object.keys(roles).sort()).toEqual([...ALL_ORG_ROLES].sort());
  });

  it("derives role statements from ROLE_PERMISSIONS", () => {
    for (const role of ALL_ORG_ROLES) {
      const expected: Record<string, string[]> = {};

      for (const permission of ROLE_PERMISSIONS[role]) {
        const [resource, action] = permission.split(":");
        (expected[resource] ??= []).push(action);
      }

      expect(roles[role].statements).toEqual(expected);
    }
  });

  it("authorizes and refuses the same permissions as can()", () => {
    expect(roles.owner.authorize({cost: ["read"]}).success).toBe(true);
    expect(roles.staff.authorize({cost: ["read"]}).success).toBe(false);
    expect(roles.staff.authorize({production: ["execute"]}).success).toBe(true);
    expect(roles.admin.authorize({organization: ["delete"]}).success).toBe(
      false,
    );
    expect(roles.sales.authorize({order: ["write"]}).success).toBe(true);
    expect(roles.accountant.authorize({report: ["finance"]}).success).toBe(
      true,
    );
  });
});
