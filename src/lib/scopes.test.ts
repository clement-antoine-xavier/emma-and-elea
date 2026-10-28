import {
  API_SCOPES,
  narrowScopesToRole,
  permissionsForScopes,
  roleSupportsScope,
  scopesForRole,
} from "@/lib/scopes";

describe("permissionsForScopes", () => {
  it("expands the API scopes into domain permissions", () => {
    const permissions = permissionsForScopes(["api:read"]);

    expect(permissions.has("catalog:read")).toBe(true);
    expect(permissions.has("order:read")).toBe(true);
    expect(permissions.has("catalog:write")).toBe(false);
  });

  it("ignores unknown and OIDC scopes", () => {
    expect(permissionsForScopes(["openid", "nope:read"]).size).toBe(0);
  });

  it("keeps execution and finance apart from write", () => {
    const execute = permissionsForScopes(["api:execute"]);
    const finance = permissionsForScopes(["api:finance"]);
    const write = permissionsForScopes(["api:write"]);

    expect(execute.has("production:execute")).toBe(true);
    expect(write.has("production:execute")).toBe(false);
    expect(finance.has("cost:read")).toBe(true);
    expect(write.has("cost:read")).toBe(false);
  });
});

describe("scopesForRole", () => {
  it("lists every scope a role can exercise", () => {
    expect(scopesForRole("owner")).toEqual([...API_SCOPES]);
  });

  it("hides finance from a staff member", () => {
    expect(scopesForRole("staff")).not.toContain("api:finance");
    expect(scopesForRole("staff")).toContain("api:execute");
  });

  it("gives an accountant finance but not write", () => {
    expect(scopesForRole("accountant")).toContain("api:finance");
    expect(scopesForRole("accountant")).not.toContain("api:write");
  });

  it("returns nothing for unknown roles", () => {
    expect(scopesForRole("nope")).toEqual([]);
    expect(roleSupportsScope(null, "api:read")).toBe(false);
  });
});

describe("narrowScopesToRole", () => {
  it("drops requested scopes the role cannot exercise", () => {
    expect(
      narrowScopesToRole("staff", ["api:read", "api:write", "api:finance"]),
    ).toEqual(["api:read", "api:write"]);
  });

  it("preserves the canonical order", () => {
    expect(
      narrowScopesToRole("owner", ["api:finance", "api:read"]),
    ).toEqual(["api:read", "api:finance"]);
  });
});
