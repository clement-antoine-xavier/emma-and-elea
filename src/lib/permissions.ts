/**
 * Organization permissions.
 *
 * The `organization`, `member`, `invitation`, `team` and `ac` resources keep
 * Better Auth's own actions so its organization endpoints keep working. The
 * domain resources below are the ones our screens check.
 *
 * A role is a fixed set of `resource:action` strings. There are no dynamic
 * roles in v1; see docs/permissions.md and ADR-0011.
 */
export const statements = {
  // Better Auth organization endpoints.
  organization: ["update", "delete", "read"] as const,
  member: ["create", "update", "delete", "read"] as const,
  invitation: ["create", "cancel", "read"] as const,
  team: ["create", "update", "delete", "read", "write", "self"] as const,
  ac: ["create", "read", "update", "delete"] as const,

  // Emma & Éléa domain.
  site: ["read", "write"] as const,
  equipment: ["read", "write"] as const,
  catalog: ["read", "write"] as const,
  supplier: ["read", "write"] as const,
  purchasing: ["read", "write"] as const,
  recipe: ["read", "write", "publish"] as const,
  cost: ["read"] as const,
  production: ["read", "write", "execute"] as const,
  task: ["read", "write", "execute"] as const,
  stock: ["read", "write", "count"] as const,
  waste: ["read", "write"] as const,
  customer: ["read", "write"] as const,
  order: ["read", "write"] as const,
  dispatch: ["read", "write"] as const,
  sales: ["read", "write"] as const,
  absence: ["read", "request", "decide"] as const,
  report: ["read", "finance", "traceability"] as const,
} as const;

export type Permission =
  | {
      [Resource in keyof typeof statements]: `${Resource}:${(typeof statements)[Resource][number]}`;
    }[keyof typeof statements];

/** Roles a member can hold. Owner and admin follow Better Auth's names. */
export const ORG_ROLES = [
  "owner",
  "admin",
  "production_manager",
  "stock_manager",
  "sales",
  "staff",
] as const;

/** Reserved role codes: present in the model, hidden from the invite picker. */
export const RESERVED_ORG_ROLES = ["accountant", "auditor"] as const;

export const ALL_ORG_ROLES = [...ORG_ROLES, ...RESERVED_ORG_ROLES] as const;

export type OrgRole = (typeof ALL_ORG_ROLES)[number];

/** Platform-level roles live on `User.role`, separate from organization roles. */
export const PLATFORM_ROLES = ["user", "support"] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

function allPermissions(): Permission[] {
  return Object.entries(statements).flatMap(([resource, actions]) =>
    actions.map((action) => `${resource}:${action}` as Permission),
  );
}

const ALL_PERMISSIONS = allPermissions();

export const ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,

  // Everything except deleting the tenant.
  admin: ALL_PERMISSIONS.filter(
    (permission) => permission !== "organization:delete",
  ),

  production_manager: [
    "organization:read",
    "member:read",
    "site:read",
    "equipment:read",
    "equipment:write",
    "catalog:read",
    "catalog:write",
    "supplier:read",
    "purchasing:read",
    "recipe:read",
    "recipe:write",
    "recipe:publish",
    "cost:read",
    "production:read",
    "production:write",
    "production:execute",
    "task:read",
    "task:write",
    "task:execute",
    "stock:read",
    "stock:write",
    "stock:count",
    "waste:read",
    "waste:write",
    "customer:read",
    "order:read",
    "dispatch:read",
    "sales:read",
    "team:read",
    "team:write",
    "team:self",
    "absence:read",
    "absence:request",
    "absence:decide",
    "report:read",
    "report:finance",
  ],

  stock_manager: [
    "organization:read",
    "member:read",
    "site:read",
    "equipment:read",
    "catalog:read",
    "catalog:write",
    "supplier:read",
    "supplier:write",
    "purchasing:read",
    "purchasing:write",
    "recipe:read",
    "production:read",
    "task:read",
    "stock:read",
    "stock:write",
    "stock:count",
    "waste:read",
    "waste:write",
    "order:read",
    "dispatch:read",
    "team:read",
    "team:self",
    "absence:read",
    "absence:request",
    "report:read",
  ],

  sales: [
    "organization:read",
    "site:read",
    "catalog:read",
    "production:read",
    "stock:read",
    "customer:read",
    "customer:write",
    "order:read",
    "order:write",
    "dispatch:read",
    "dispatch:write",
    "sales:read",
    "sales:write",
    "team:self",
    "absence:read",
    "absence:request",
    "report:read",
  ],

  staff: [
    "organization:read",
    "site:read",
    "catalog:read",
    "recipe:read",
    "production:read",
    "production:execute",
    "task:read",
    "task:execute",
    "stock:read",
    "stock:count",
    "waste:read",
    "waste:write",
    "team:self",
    "absence:read",
    "absence:request",
  ],

  accountant: [
    "organization:read",
    "site:read",
    "catalog:read",
    "supplier:read",
    "purchasing:read",
    "recipe:read",
    "cost:read",
    "production:read",
    "task:read",
    "stock:read",
    "waste:read",
    "customer:read",
    "order:read",
    "dispatch:read",
    "sales:read",
    "report:read",
    "report:finance",
  ],

  auditor: [
    "organization:read",
    "site:read",
    "catalog:read",
    "supplier:read",
    "purchasing:read",
    "recipe:read",
    "production:read",
    "task:read",
    "stock:read",
    "waste:read",
    "order:read",
    "dispatch:read",
    "report:read",
    "report:traceability",
  ],
};

const ROLE_PERMISSION_SETS = Object.fromEntries(
  ALL_ORG_ROLES.map((role) => [role, new Set(ROLE_PERMISSIONS[role])]),
) as unknown as Record<OrgRole, ReadonlySet<Permission>>;

export function isOrgRole(value: unknown): value is OrgRole {
  return (
    typeof value === "string" &&
    (ALL_ORG_ROLES as readonly string[]).includes(value)
  );
}

export function isReservedOrgRole(value: unknown): value is OrgRole {
  return (
    typeof value === "string" &&
    (RESERVED_ORG_ROLES as readonly string[]).includes(value)
  );
}

export function isPlatformRole(value: unknown): value is PlatformRole {
  return (
    typeof value === "string" &&
    (PLATFORM_ROLES as readonly string[]).includes(value)
  );
}

/** Unknown or missing roles get no permissions: checks fail closed. */
export function can(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  if (!isOrgRole(role)) return false;
  return ROLE_PERMISSION_SETS[role].has(permission);
}

export function canAny(
  role: string | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => can(role, permission));
}

export function permissionsFor(role: string | null | undefined): Permission[] {
  if (!isOrgRole(role)) return [];
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * Roles an actor may assign. Owners can hand out any active role, including
 * ownership. Admins manage everyone except owners. Reserved roles stay hidden
 * until their screens exist.
 */
export function assignableRolesFor(
  actorRole: string | null | undefined,
): OrgRole[] {
  if (actorRole === "owner") return [...ORG_ROLES];
  if (actorRole === "admin") {
    return ORG_ROLES.filter((role) => role !== "owner");
  }
  return [];
}

export function canManageMember(
  actorRole: string | null | undefined,
  targetRole: string | null | undefined,
  isSelf: boolean,
): boolean {
  if (isSelf) return false;
  if (actorRole === "owner") return true;
  if (actorRole !== "admin") return false;
  return targetRole !== "owner";
}

export function isPlatformSupport(role: string | null | undefined): boolean {
  // "admin" is accepted as a legacy value from earlier installs.
  return role === "support" || role === "admin";
}
