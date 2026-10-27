import type {OrgRole} from "@/lib/permissions";
import type {OrganizationActor} from "@/server/auth/types";
import type {ForecastRepository} from "@/server/repositories/forecast.repository";
import type {PlanningRepository} from "@/server/repositories/planning.repository";
import type {ProductionRepository} from "@/server/repositories/production.repository";
import type {StockRepository} from "@/server/repositories/stock.repository";
import type {OrganizationSettingsRepository} from "@/server/repositories/organization-settings.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import {createPlanningService} from "./planning.service";

function actorFor(role: OrgRole): OrganizationActor {
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
  };
}

const site = {
  id: "site_1",
  code: "ATL",
  name: "Atelier",
  kind: "WORKSHOP" as const,
  city: null,
  timezone: "Europe/Paris",
  isActive: true,
  archivedAt: null,
};

const forecastItem = {
  itemId: "item_1",
  itemCode: "CRO",
  itemName: "Croissant",
  stockUnitId: "unit_kg",
  stockUnitCode: "kg",
  stockUnitKind: "MASS" as const,
  stockUnitFactorToBase: "1",
  recipeId: "recipe_1",
  recipeName: "Croissant",
  recipeVersionId: "version_1",
  yieldUnitId: "unit_g",
  yieldUnitCode: "g",
  yieldUnitKind: "MASS" as const,
  yieldUnitFactorToBase: "0.001",
};

function forecastRepository(
  overrides: Partial<ForecastRepository> = {},
): ForecastRepository {
  return {
    listItems: jest.fn().mockResolvedValue([forecastItem]),
    salesHistory: jest.fn().mockResolvedValue([
      {
        itemId: "item_1",
        businessDate: new Date("2026-10-20T00:00:00.000Z"),
        quantity: "140",
        unitKind: "MASS",
        unitFactorToBase: "1",
      },
    ]),
    eventUplift: jest.fn().mockResolvedValue([]),
    orderDemand: jest.fn().mockResolvedValue([
      {
        orderId: "order_1",
        orderNumber: "ORD-1",
        customerName: "Café",
        orderLineId: "line_1",
        itemId: "item_1",
        itemCode: "CRO",
        itemName: "Croissant",
        quantity: "3",
        fulfilledQuantity: "0",
        unitKind: "MASS",
        unitFactorToBase: "1",
        stockUnitId: "unit_kg",
        stockUnitCode: "kg",
        stockUnitKind: "MASS",
        stockUnitFactorToBase: "1",
      },
    ]),
    ...overrides,
  } as unknown as ForecastRepository;
}

function planningRepository(
  overrides: Partial<PlanningRepository> = {},
): PlanningRepository {
  return {
    listPlans: jest.fn().mockResolvedValue([]),
    findPlan: jest.fn(),
    findOpenPlan: jest.fn().mockResolvedValue(null),
    createPlan: jest.fn().mockResolvedValue("plan_1"),
    addLine: jest.fn().mockResolvedValue(undefined),
    updateLine: jest.fn().mockResolvedValue(undefined),
    removeLine: jest.fn().mockResolvedValue(undefined),
    confirm: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    findLineForBatch: jest.fn(),
    ...overrides,
  } as unknown as PlanningRepository;
}

function stockRepository(): StockRepository {
  return {
    listLevels: jest.fn().mockResolvedValue([
      {
        siteId: "site_1",
        siteName: "Atelier",
        itemId: "item_1",
        itemCode: "CRO",
        itemName: "Croissant",
        quantity: "4",
        unitCode: "kg",
        minStockQuantity: null,
        isBelowMin: false,
      },
    ]),
    listLots: jest.fn(),
    findLot: jest.fn(),
  } as unknown as StockRepository;
}

function productionRepository(
  overrides: Partial<ProductionRepository> = {},
): ProductionRepository {
  return {
    createBatch: jest.fn().mockResolvedValue("batch_1"),
    ...overrides,
  } as unknown as ProductionRepository;
}

function settingsRepository(
  overrides: Partial<OrganizationSettingsRepository> = {},
): OrganizationSettingsRepository {
  return {
    get: jest.fn().mockResolvedValue({
      currency: "EUR",
      overheadPct: "0",
      forecastHistoryDays: 49,
      forecastSafetyPct: "5",
      defaultShelfLifeDays: null,
      lotNumberPattern: "{site}-{yyMMdd}-{seq}",
      pricesIncludeVat: false,
    }),
    ensureDefaults: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as OrganizationSettingsRepository;
}

function siteRepository(): SiteRepository {
  return {
    list: jest.fn().mockResolvedValue([site]),
    findById: jest.fn().mockResolvedValue(site),
  } as unknown as SiteRepository;
}

function service(
  overrides: {
    planning?: Partial<PlanningRepository>;
    forecast?: Partial<ForecastRepository>;
    production?: Partial<ProductionRepository>;
  } = {},
) {
  return createPlanningService({
    planningRepository: planningRepository(overrides.planning),
    forecastRepository: forecastRepository(overrides.forecast),
    stockRepository: stockRepository(),
    productionRepository: productionRepository(overrides.production),
    settingsRepository: settingsRepository(),
    siteRepository: siteRepository(),
  });
}

describe("planning service", () => {
  it("builds forecast suggestions and converted order demand", async () => {
    const {board} = await service().getBoard(actorFor("production_manager"), {
      siteId: "site_1",
      date: "2026-10-27",
    });

    expect(board.suggestions).toHaveLength(1);
    expect(board.suggestions[0]).toMatchObject({
      itemId: "item_1",
      suggestedQuantity: "21",
      stockQuantity: "4",
      basis: "WEEKDAY",
    });
    expect(board.orders).toHaveLength(1);
    expect(board.orders[0]).toMatchObject({
      orderLineId: "line_1",
      quantity: "3",
      recipeId: "recipe_1",
    });
    expect(board.openPlanId).toBeNull();
  });

  it("creates one plan from forecast and orders", async () => {
    const planning = planningRepository();
    const planningService = service({planning});

    await planningService.createPlan(actorFor("production_manager"), {
      siteId: "site_1",
      plannedFor: new Date("2026-10-27T00:00:00.000Z"),
      includeForecast: true,
      includeOrders: true,
      note: null,
    });

    expect(planning.createPlan).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({
        siteId: "site_1",
        source: "MIXED",
        lines: expect.arrayContaining([
          expect.objectContaining({
            itemId: "item_1",
            orderLineId: null,
            plannedQuantity: "21",
            unitId: "unit_kg",
          }),
          expect.objectContaining({
            itemId: "item_1",
            orderLineId: "line_1",
            plannedQuantity: "3",
            unitId: "unit_kg",
          }),
        ]),
      }),
    );
  });

  it("refuses a second open plan for the same site and day", async () => {
    const planning = planningRepository({
      findOpenPlan: jest.fn().mockResolvedValue({
        id: "plan_1",
        siteId: "site_1",
        siteName: "Atelier",
        plannedFor: new Date("2026-10-27T00:00:00.000Z"),
        status: "DRAFT",
        source: "FORECAST",
        lineCount: 1,
        createdAt: new Date(),
      }),
    });

    await expect(
      service({planning}).createPlan(actorFor("production_manager"), {
        siteId: "site_1",
        plannedFor: new Date("2026-10-27T00:00:00.000Z"),
        includeForecast: true,
        includeOrders: false,
        note: null,
      }),
    ).rejects.toMatchObject({code: "CONFLICT"});
  });

  it("rejects planning writes from read-only roles", async () => {
    await expect(
      service().createPlan(actorFor("staff"), {
        siteId: "site_1",
        plannedFor: new Date("2026-10-27T00:00:00.000Z"),
        includeForecast: true,
        includeOrders: false,
        note: null,
      }),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("creates a batch from a confirmed plan line in the recipe yield unit", async () => {
    const line = {
      planId: "plan_1",
      planStatus: "CONFIRMED" as const,
      siteId: "site_1",
      plannedFor: new Date("2026-10-27T00:00:00.000Z"),
      lineId: "plan_line_1",
      quantity: "2",
      unitKind: "MASS" as const,
      unitFactorToBase: "1",
      recipeId: "recipe_1",
      recipeName: "Croissant",
      recipeVersionId: "version_1",
      recipeVersionStatus: "PUBLISHED",
      yieldUnitId: "unit_g",
      yieldUnitKind: "MASS" as const,
      yieldUnitFactorToBase: "0.001",
      batchId: null,
      note: null,
    };
    const production = productionRepository();
    const planningService = service({
      planning: {
        findLineForBatch: jest.fn().mockResolvedValue(line),
      },
      production,
    });

    const result = await planningService.createBatchFromLine(
      actorFor("production_manager"),
      "plan_line_1",
    );

    expect(result).toEqual({batchId: "batch_1"});
    expect(production.createBatch).toHaveBeenCalledWith("org_1", {
      siteId: "site_1",
      recipeVersionId: "version_1",
      productionPlanLineId: "plan_line_1",
      plannedQuantity: "2000",
      unitId: "unit_g",
      plannedStartAt: null,
      note: null,
    });
  });

  it("does not execute a draft plan", async () => {
    const planningService = service({
      planning: {
        findLineForBatch: jest.fn().mockResolvedValue({
          planStatus: "DRAFT",
          batchId: null,
        }),
      },
    });

    await expect(
      planningService.createBatchFromLine(
        actorFor("production_manager"),
        "plan_line_1",
      ),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });
});
