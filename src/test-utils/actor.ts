import type {Actor, OrganizationActor} from "@/server/auth/types";
import type {OrgRole} from "@/lib/permissions";

/**
 * An authenticated organization member for service tests. Services never
 * reach the database, so a plain object is enough to exercise the guards.
 */
export function actorFor(
  role: OrgRole = "owner",
  overrides: Partial<OrganizationActor> = {},
): OrganizationActor {
  return {
    userId: "user_1",
    name: "Actor",
    email: "actor@example.com",
    platformRole: "user",
    isSupport: false,
    sessionId: "session_1",
    activeOrganizationId: "org_1",
    membershipId: "member_1",
    organizationId: "org_1",
    organization: {id: "org_1", name: "Bakery", slug: "bakery"},
    role,
    ...overrides,
  };
}

/** A signed-in user without a membership (the onboarding state). */
export function actorWithoutOrganization(): Actor {
  return {
    ...actorFor(),
    activeOrganizationId: null,
    membershipId: null,
    organizationId: null,
    organization: null,
    role: null,
  };
}
