import {betterAuthGateway} from "@/server/auth/better-auth.gateway";
import {equipmentRepository} from "@/server/repositories/equipment.repository";
import {invitationRepository} from "@/server/repositories/invitation.repository";
import {membershipRepository} from "@/server/repositories/membership.repository";
import {organizationSettingsRepository} from "@/server/repositories/organization-settings.repository";
import {rateRepository} from "@/server/repositories/rate.repository";
import {siteRepository} from "@/server/repositories/site.repository";
import {createDashboardService} from "./dashboard.service";
import {createEquipmentService} from "./equipment.service";
import {createInvitationService} from "./invitation.service";
import {organizationBootstrapService} from "./organization-bootstrap.container";
import {createOrganizationService} from "./organization.service";
import {createRateService} from "./rate.service";
import {createSettingsService} from "./settings.service";
import {createSiteService} from "./site.service";
import {createTeamService} from "./team.service";

export const organizationService = createOrganizationService({
  authGateway: betterAuthGateway,
  bootstrapService: organizationBootstrapService,
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

export const siteService = createSiteService({siteRepository});

export const settingsService = createSettingsService({
  settingsRepository: organizationSettingsRepository,
});

export const rateService = createRateService({rateRepository});

export const equipmentService = createEquipmentService({equipmentRepository});
