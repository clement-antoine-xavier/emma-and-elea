import {createAccessControl} from "better-auth/plugins/access";
import {
  ALL_ORG_ROLES,
  ROLE_PERMISSIONS,
  statements,
  type OrgRole,
  type Permission,
} from "@/lib/permissions";

/**
 * Better Auth needs executable role objects for its organization endpoints.
 * They are built from the same matrix the UI uses (`ROLE_PERMISSIONS`), so the
 * server API and the app checks cannot drift apart.
 */
export const ac = createAccessControl(statements);

function toRoleStatements(
  permissions: readonly Permission[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const permission of permissions) {
    const [resource, action] = permission.split(":");
    (result[resource] ??= []).push(action);
  }

  return result;
}

export const roles = Object.fromEntries(
  ALL_ORG_ROLES.map((role) => [
    role,
    ac.newRole(toRoleStatements(ROLE_PERMISSIONS[role])),
  ]),
) as unknown as Record<OrgRole, ReturnType<typeof ac.newRole>>;
