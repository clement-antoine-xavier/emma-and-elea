import {betterAuthGateway} from "@/server/auth/better-auth.gateway";
import {catalogRepository} from "@/server/repositories/catalog.repository";
import {costingRepository} from "@/server/repositories/costing.repository";
import {customerRepository} from "@/server/repositories/customer.repository";
import {dispatchRepository} from "@/server/repositories/dispatch.repository";
import {equipmentRepository} from "@/server/repositories/equipment.repository";
import {eventRepository} from "@/server/repositories/event.repository";
import {forecastRepository} from "@/server/repositories/forecast.repository";
import {invitationRepository} from "@/server/repositories/invitation.repository";
import {membershipRepository} from "@/server/repositories/membership.repository";
import {orderRepository} from "@/server/repositories/order.repository";
import {organizationSettingsRepository} from "@/server/repositories/organization-settings.repository";
import {planningRepository} from "@/server/repositories/planning.repository";
import {profitabilityRepository} from "@/server/repositories/profitability.repository";
import {purchaseRepository} from "@/server/repositories/purchase.repository";
import {rateRepository} from "@/server/repositories/rate.repository";
import {recipeRepository} from "@/server/repositories/recipe.repository";
import {productionRepository} from "@/server/repositories/production.repository";
import {reportRepository} from "@/server/repositories/report.repository";
import {salesRepository} from "@/server/repositories/sales.repository";
import {scheduleRepository} from "@/server/repositories/schedule.repository";
import {siteRepository} from "@/server/repositories/site.repository";
import {skillRepository} from "@/server/repositories/skill.repository";
import {stockCountRepository} from "@/server/repositories/stock-count.repository";
import {stockRepository} from "@/server/repositories/stock.repository";
import {supplierRepository} from "@/server/repositories/supplier.repository";
import {taskRepository} from "@/server/repositories/task.repository";
import {createAlertService} from "./alert.service";
import {createDashboardService} from "./dashboard.service";
import {createAssistantService} from "./assistant.service";
import {createHomeService} from "./home.service";
import {createCatalogService} from "./catalog.service";
import {createCustomerService} from "./customer.service";
import {createDailySalesService} from "./daily-sales.service";
import {createDispatchService} from "./dispatch.service";
import {createEquipmentService} from "./equipment.service";
import {createEventService} from "./event.service";
import {createInvitationService} from "./invitation.service";
import {createOrderService} from "./order.service";
import {organizationBootstrapService} from "./organization-bootstrap.container";
import {createOrganizationService} from "./organization.service";
import {createPlanningService} from "./planning.service";
import {createProductionService} from "./production.service";
import {createPurchasingService} from "./purchasing.service";
import {createRateService} from "./rate.service";
import {createRecipeService} from "./recipe.service";
import {createReportService} from "./report.service";
import {createScheduleService} from "./schedule.service";
import {createSettingsService} from "./settings.service";
import {createSiteService} from "./site.service";
import {createSkillService} from "./skill.service";
import {createStockCountService} from "./stock-count.service";
import {createStockService} from "./stock.service";
import {createSupplierService} from "./supplier.service";
import {createTaskService} from "./task.service";
import {createWorkloadService} from "./workload.service";
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

export const assistantService = createAssistantService();

export const siteService = createSiteService({siteRepository});

export const settingsService = createSettingsService({
  settingsRepository: organizationSettingsRepository,
});

export const rateService = createRateService({rateRepository});

export const equipmentService = createEquipmentService({equipmentRepository});

export const eventService = createEventService({eventRepository});

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

export const stockService = createStockService({
  stockRepository,
  supplierRepository,
});

export const recipeService = createRecipeService({
  recipeRepository,
  costingRepository,
  catalogRepository,
  equipmentRepository,
  rateRepository,
  skillRepository,
});

export const productionService = createProductionService({
  productionRepository,
  costingRepository,
  taskRepository,
});

export const planningService = createPlanningService({
  planningRepository,
  forecastRepository,
  stockRepository,
  productionRepository,
  settingsRepository: organizationSettingsRepository,
  siteRepository,
  taskRepository,
});

export const customerService = createCustomerService({customerRepository});

export const orderService = createOrderService({
  orderRepository,
  customerRepository,
  siteRepository,
  catalogRepository,
  costingRepository,
});

export const dispatchService = createDispatchService({
  dispatchRepository,
  customerRepository,
  siteRepository,
  orderRepository,
});

export const dailySalesService = createDailySalesService({
  salesRepository,
  catalogRepository,
  siteRepository,
  costingRepository,
});

export const reportService = createReportService({
  reportRepository,
  stockRepository,
  profitabilityRepository,
});

export const skillService = createSkillService({skillRepository});

export const taskService = createTaskService({taskRepository});

export const workloadService = createWorkloadService({
  scheduleRepository,
  taskRepository,
});

export const alertService = createAlertService({
  stockRepository,
  scheduleRepository,
  taskRepository,
});

export const scheduleService = createScheduleService({
  scheduleRepository,
  siteRepository,
});

export const stockCountService = createStockCountService({
  stockCountRepository,
  siteRepository,
});

export const homeService = createHomeService({
  reportService,
  dailySalesService,
  productionService,
  orderService,
  stockService,
});
