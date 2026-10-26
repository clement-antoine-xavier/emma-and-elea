import {betterAuthGateway} from "@/server/auth/better-auth.gateway";
import {invitationRepository} from "@/server/repositories/invitation.repository";
import {membershipRepository} from "@/server/repositories/membership.repository";
import {createDashboardService} from "./dashboard.service";
import {createInvitationService} from "./invitation.service";
import {createOrganizationService} from "./organization.service";
import {createTeamService} from "./team.service";

export const organizationService = createOrganizationService({
  authGateway: betterAuthGateway,
});

export const teamService = createTeamService({
  membershipRepository,
  invitationRepository,
  authGateway: betterAuthGateway,
});

export const invitationService = createInvitationService({
  invitationRepository,
  authGateway: betterAuthGateway,
});

export const dashboardService = createDashboardService();
