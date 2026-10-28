import {
  isOrgRole,
  isPlatformSupport,
  permissionsFor,
  type Permission,
} from "@/lib/permissions";
import {TOKEN_ORG_CLAIM, permissionsForScopes} from "@/lib/scopes";
import {DomainError} from "@/server/domain/errors";
import {membershipRepository} from "@/server/repositories/membership.repository";
import type {OrganizationActor} from "./types";

/** Structural view of the verified JWT claims we read. */
export type TokenClaims = Record<string, unknown>;

function claimString(claims: TokenClaims, name: string): string | null {
  const value = claims[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function scopesFromClaim(scope: unknown): string[] {
  if (typeof scope !== "string") return [];
  return scope.split(/\s+/).filter(Boolean);
}

/**
 * Builds the actor for a bearer-token request from verified access-token claims.
 *
 * The organization comes from the consent-bound claim (never from a tool
 * argument), the role comes from the database on every call, and the scope set
 * is the intersection of the token's scopes and that role. A token therefore
 * narrows what its holder can do and can never outlive a demotion.
 */
export async function resolveTokenActor(
  claims: TokenClaims,
): Promise<OrganizationActor> {
  const userId = claimString(claims, "sub");
  const organizationId = claimString(claims, TOKEN_ORG_CLAIM);

  if (!userId) {
    throw new DomainError("FORBIDDEN", "TOKEN_USER_REQUIRED");
  }
  if (!organizationId) {
    throw new DomainError("FORBIDDEN", "TOKEN_ORGANIZATION_REQUIRED");
  }

  const membership = await membershipRepository.findMembershipForUserInOrganization(
    userId,
    organizationId,
  );

  if (!membership) {
    throw new DomainError("FORBIDDEN", "TOKEN_MEMBERSHIP_REQUIRED");
  }
  if (!isOrgRole(membership.role)) {
    throw new DomainError("FORBIDDEN", "TOKEN_UNKNOWN_ROLE");
  }

  const rolePermissions = new Set(permissionsFor(membership.role));
  const tokenPermissions = permissionsForScopes(scopesFromClaim(claims.scope));

  return {
    userId,
    name: membership.user.name,
    email: membership.user.email,
    platformRole: membership.user.role ?? null,
    isSupport: isPlatformSupport(membership.user.role),
    sessionId: claimString(claims, "sid") ?? "",
    activeOrganizationId: organizationId,
    membershipId: membership.id,
    organizationId,
    organization: membership.organization,
    role: membership.role,
    scopes: new Set(
      [...tokenPermissions].filter((permission: Permission) =>
        rolePermissions.has(permission),
      ),
    ),
  };
}
