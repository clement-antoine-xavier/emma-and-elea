import type {OrgRole} from "@/lib/permissions";
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
};

export type OrganizationActor = Actor & {
  membershipId: string;
  organizationId: string;
  organization: OrganizationSummary;
  role: OrgRole;
};
