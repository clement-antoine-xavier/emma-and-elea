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
