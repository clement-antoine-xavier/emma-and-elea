import {isOrgRole, permissionsFor, type Permission} from "./permissions";

/**
 * Namespaced claim carrying the organization a consent was granted for.
 * Access tokens are audience-bound to one resource and this claim binds them
 * to a tenant; see ADR-0020 and ADR-0021.
 */
export const TOKEN_ORG_CLAIM = "https://emma-elea.app/org";

/**
 * Resource-neutral scopes shared by the MCP server and the REST API. They
 * describe what a client may attempt; the member role still decides what the
 * user may do (ADR-0021).
 */
export const API_SCOPES = [
  "api:read",
  "api:write",
  "api:execute",
  "api:finance",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

/** OIDC/OAuth scopes the provider always supports. */
export const OAUTH_STANDARD_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
] as const;

const READ_PERMISSIONS = [
  "organization:read",
  "site:read",
  "equipment:read",
  "catalog:read",
  "supplier:read",
  "purchasing:read",
  "recipe:read",
  "production:read",
  "task:read",
  "stock:read",
  "waste:read",
  "customer:read",
  "order:read",
  "dispatch:read",
  "sales:read",
  "absence:read",
  "report:read",
  "team:read",
] as const satisfies readonly Permission[];

const WRITE_PERMISSIONS = [
  "site:write",
  "equipment:write",
  "catalog:write",
  "supplier:write",
  "purchasing:write",
  "recipe:write",
  "recipe:publish",
  "production:write",
  "task:write",
  "stock:write",
  "waste:write",
  "customer:write",
  "order:write",
  "dispatch:write",
  "sales:write",
] as const satisfies readonly Permission[];

/**
 * Operations that post stock ledger entries or record execution. Kept apart
 * from `api:write` because a client may create drafts without being allowed to
 * post irreversible movements.
 */
const EXECUTE_PERMISSIONS = [
  "production:execute",
  "task:execute",
  "stock:count",
] as const satisfies readonly Permission[];

const FINANCE_PERMISSIONS = [
  "report:read",
  "cost:read",
  "report:finance",
  "report:traceability",
] as const satisfies readonly Permission[];

/**
 * Scope to permission projection. Every entry point checks the intersection of
 * the token scopes and the current role.
 */
export const SCOPE_PERMISSIONS: Record<ApiScope, readonly Permission[]> = {
  "api:read": READ_PERMISSIONS,
  "api:write": WRITE_PERMISSIONS,
  "api:execute": EXECUTE_PERMISSIONS,
  "api:finance": FINANCE_PERMISSIONS,
};

export function isApiScope(value: string): value is ApiScope {
  return (API_SCOPES as readonly string[]).includes(value);
}

/** Expands granted scopes into permissions. Unknown scopes grant nothing. */
export function permissionsForScopes(
  scopes: Iterable<string>,
): ReadonlySet<Permission> {
  const granted = new Set<Permission>();

  for (const scope of scopes) {
    if (!isApiScope(scope)) continue;
    for (const permission of SCOPE_PERMISSIONS[scope]) granted.add(permission);
  }

  return granted;
}

/** A role's permissions expressed as the scopes that could grant them. */
export function scopesForRole(role: string | null | undefined): ApiScope[] {
  if (!isOrgRole(role)) return [];

  const permissions = new Set(permissionsFor(role));

  return API_SCOPES.filter((scope) =>
    SCOPE_PERMISSIONS[scope].some((permission) => permissions.has(permission)),
  );
}

/** Whether the role holds at least one permission behind the scope. */
export function roleSupportsScope(
  role: string | null | undefined,
  scope: ApiScope,
): boolean {
  return scopesForRole(role).includes(scope);
}

/** Narrows requested scopes to the ones a role can actually exercise. */
export function narrowScopesToRole(
  role: string | null | undefined,
  requested: Iterable<string>,
): ApiScope[] {
  const supported = new Set(scopesForRole(role));
  const asked = new Set(requested);

  return API_SCOPES.filter(
    (scope) => supported.has(scope) && asked.has(scope),
  );
}
