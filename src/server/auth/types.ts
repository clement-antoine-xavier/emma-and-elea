import type {OrgRole, Permission} from "@/lib/permissions";
import type {OrganizationSummary} from "@/server/repositories/types";

export type Actor = {
  userId: string;
  name: string;
  email: string;
  platformRole: string | null;
  isSupport: boolean;
  sessionId: string;
  activeOrganizationId: string | null;
  membershipId: string | null;
  organizationId: string | null;
  organization: OrganizationSummary | null;
  role: OrgRole | null;
  /**
   * Permissions the current credential may exercise. Session actors carry
   * their whole role; MCP actors carry the intersection of the access token's
   * scopes and the role, so a token can narrow permissions but never widen
   * them. Absent means "derive from the role" (older call sites and tests).
   */
  scopes?: ReadonlySet<Permission>;
};

export type OrganizationActor = Actor & {
  membershipId: string;
  organizationId: string;
  organization: OrganizationSummary;
  role: OrgRole;
};
