/**
 * Repository DTOs are plain and serializable.
 *
 * Conventions (M0, ADR-0014):
 * - Money and quantities are `Decimal` columns: repositories map them to
 *   strings so Server Components can pass them to Client Components without a
 *   precision loss. Formatting happens in `src/lib/format.ts`.
 * - Instants stay `Date` inside the server. Pages convert them to ISO strings
 *   at the boundary, as `TeamPage` does.
 * - Tenant-scoped reads always receive the `organizationId` resolved from the
 *   session.
 */
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type {
  EnergyTariffRecord,
  EquipmentRecord,
  LabourRateRecord,
  OrganizationSettingsRecord,
  SiteRecord,
} from "@/lib/dto";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
};

export type MembershipWithOrganization = {
  id: string;
  organizationId: string;
  role: string;
  createdAt: Date;
  organization: OrganizationSummary;
};

/** Membership plus the account fields an actor needs, resolved for MCP. */
export type MembershipActorRecord = MembershipWithOrganization & {
  user: {
    name: string;
    email: string;
    role: string | null;
  };
};

export type TeamMemberRecord = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

export type MemberTargetRecord = {
  id: string;
  userId: string;
  role: string;
};

export type PendingInvitationRecord = {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
};

export type InvitationDetailRecord = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  organization: OrganizationSummary;
  inviter: {
    name: string;
    email: string;
  };
};
