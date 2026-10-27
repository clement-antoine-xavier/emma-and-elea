import {betterAuthGateway} from "@/server/auth/better-auth.gateway";
import {catalogRepository} from "@/server/repositories/catalog.repository";
import {costingRepository} from "@/server/repositories/costing.repository";
import {equipmentRepository} from "@/server/repositories/equipment.repository";
import {invitationRepository} from "@/server/repositories/invitation.repository";
import {membershipRepository} from "@/server/repositories/membership.repository";
import {organizationSettingsRepository} from "@/server/repositories/organization-settings.repository";
import {purchaseRepository} from "@/server/repositories/purchase.repository";
import {rateRepository} from "@/server/repositories/rate.repository";
import {recipeRepository} from "@/server/repositories/recipe.repository";
import {productionRepository} from "@/server/repositories/production.repository";
import {siteRepository} from "@/server/repositories/site.repository";
import {stockRepository} from "@/server/repositories/stock.repository";
import {supplierRepository} from "@/server/repositories/supplier.repository";
import {createDashboardService} from "./dashboard.service";
import {createCatalogService} from "./catalog.service";
import {createEquipmentService} from "./equipment.service";
import {createInvitationService} from "./invitation.service";
import {organizationBootstrapService} from "./organization-bootstrap.container";
import {createOrganizationService} from "./organization.service";
import {createProductionService} from "./production.service";
import {createPurchasingService} from "./purchasing.service";
import {createRateService} from "./rate.service";
import {createRecipeService} from "./recipe.service";
import {createSettingsService} from "./settings.service";
import {createSiteService} from "./site.service";
import {createStockService} from "./stock.service";
import {createSupplierService} from "./supplier.service";
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

export const catalogService = createCatalogService({catalogRepository});

export const supplierService = createSupplierService({
  supplierRepository,
  catalogRepository,
});

export const purchasingService = createPurchasingService({
  purchaseRepository,
  supplierRepository,
  siteRepository,
  catalogRepository,
});

export const stockService = createStockService({stockRepository});

export const recipeService = createRecipeService({
  recipeRepository,
  costingRepository,
  catalogRepository,
  equipmentRepository,
  rateRepository,
});

export const productionService = createProductionService({
  productionRepository,
  costingRepository,
});
