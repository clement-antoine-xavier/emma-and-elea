import type {DailySalesService} from "@/server/services/daily-sales.service";
import type {OrderService} from "@/server/services/order.service";
import type {ProductionService} from "@/server/services/production.service";
import type {ReportService} from "@/server/services/report.service";
import type {StockService} from "@/server/services/stock.service";
import {createHomeService, normalizePeriod} from "@/server/services/home.service";
import {actorFor} from "@/test-utils/actor";

const reportService = {
  getKpis: jest.fn(),
  getReports: jest.fn(),
} as unknown as ReportService;

const dailySalesService = {
  getDailySales: jest.fn(),
} as unknown as DailySalesService;

const productionService = {
  getBatches: jest.fn(),
} as unknown as ProductionService;

const orderService = {
  getOrders: jest.fn(),
} as unknown as OrderService;

const stockService = {
  getLevels: jest.fn(),
} as unknown as StockService;

const service = createHomeService({
  reportService,
  dailySalesService,
  productionService,
  orderService,
  stockService,
});

function saleRow(date: string, revenue: string, quantity: string) {
  return {
    id: `sale-${date}`,
    businessDate: new Date(`${date}T00:00:00.000Z`),
    siteId: "site_1",
    siteName: "Bakery",
    itemId: "item_1",
    itemName: "Baguette",
    quantitySold: quantity,
    unitCode: "piece",
    revenue,
    currency: "EUR",
    channel: "RETAIL",
    source: "RECORDED",
  };
}

function batchRow(
  status: string,
  producedOn: string | null,
  id = `batch-${status}-${producedOn}`,
) {
  return {
    id,
    code: `LOT-${id}`,
    status,
    siteName: "Bakery",
    recipeName: "Baguette",
    versionNumber: 1,
    plannedQuantity: "60",
    actualQuantity: status === "COMPLETED" ? "58" : null,
    unitCode: "piece",
    producedOn: producedOn ? new Date(`${producedOn}T00:00:00.000Z`) : null,
    createdAt: new Date("2026-10-27T10:00:00.000Z"),
  };
}

function levelRow(name: string, belowMin: boolean) {
  return {
    itemId: `item-${name}`,
    itemCode: `CODE-${name}`,
    itemName: name,
    siteId: "site_1",
    siteName: "Bakery",
    unitCode: "kg",
    quantity: "1",
    minStockQuantity: "5",
    parLevelQuantity: "10",
    isBelowMin: belowMin,
  };
}

function resetMocks() {
  jest.clearAllMocks();
  reportService.getKpis = jest.fn().mockResolvedValue({
    batchesToday: 3,
    lowStockCount: 1,
    expiringLotsCount: 4,
    wasteCost30d: "12.36",
    currency: "EUR",
  }) as never;
  dailySalesService.getDailySales = jest
    .fn()
    .mockImplementation(async (_actor, filters: {from: string; to: string}) => {
      if (filters.to === "2026-10-28") {
        return {
          rows: [
            saleRow("2026-10-27", "10", "2"),
            saleRow("2026-10-28", "15", "3"),
          ],
          from: new Date("2026-10-01T00:00:00.000Z"),
          to: new Date("2026-10-28T23:59:59.999Z"),
          canWrite: true,
        };
      }
      return {
        rows: [saleRow("2026-09-28", "10", "2")],
        from: new Date("2026-08-01T00:00:00.000Z"),
        to: new Date("2026-09-28T23:59:59.999Z"),
        canWrite: true,
      };
    }) as never;
  productionService.getBatches = jest.fn().mockResolvedValue({
    batches: [
      batchRow("COMPLETED", "2026-10-28", "today"),
      batchRow("COMPLETED", "2026-10-27", "yesterday"),
      batchRow("PLANNED", null, "planned"),
    ],
    canWrite: true,
    canExecute: true,
  }) as never;
  orderService.getOrders = jest.fn().mockResolvedValue({
    page: {
      items: [
        {
          id: "order_1",
          number: "ORD-1",
          customerName: "Client",
          siteName: "Bakery",
          status: "CONFIRMED",
          requestedFor: new Date("2026-10-29T00:00:00.000Z"),
          totalAmount: "42",
          currency: "EUR",
          lineCount: 2,
          createdAt: new Date("2026-10-27T10:00:00.000Z"),
        },
      ],
      total: 5,
      page: 1,
      pageSize: 6,
    },
    canWrite: true,
    filters: {search: "", status: null},
  }) as never;
  stockService.getLevels = jest.fn().mockResolvedValue({
    levels: [levelRow("Flour", false), levelRow("Salt", true)],
    alerts: [levelRow("Salt", true)],
  }) as never;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-28T12:00:00.000Z"));
  resetMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("normalizePeriod", () => {
  it("accepts only the supported periods", () => {
    expect(normalizePeriod("7")).toBe(7);
    expect(normalizePeriod(["90"])).toBe(90);
    expect(normalizePeriod("14")).toBe(30);
    expect(normalizePeriod(undefined)).toBe(30);
  });
});

describe("homeService", () => {
  it("builds the owner dashboard with a continuous 30-day axis", async () => {
    const home = await service.getHome(actorFor("owner"), 30);

    expect(home.salesTrend).toHaveLength(30);
    expect(home.salesTrend[0]?.date).toBe("2026-09-29");
    expect(home.salesTrend.at(-1)?.date).toBe("2026-10-28");
    expect(home.salesTrend.at(-1)?.revenue).toBe(15);
    expect(home.productionTrend.at(-1)?.completed).toBe(1);
    expect(home.productionTrend).toHaveLength(30);

    expect(home.kpis).toMatchObject({
      batchesToday: 3,
      plannedBatches: 1,
      lowStockCount: 1,
      expiringLotsCount: 4,
      revenue: 25,
      revenueDeltaPct: 150,
      orderCount: 5,
      wasteCost: "12.36",
    });
    expect(home.alerts).toHaveLength(1);
    expect(home.upcomingBatches).toHaveLength(1);
    expect(home.recentOrders).toHaveLength(1);
    expect(home.can).toMatchObject({
      sales: true,
      orders: true,
      production: true,
      stock: true,
      reports: true,
      finance: true,
    });
  });

  it("returns a 7-day window ending today", async () => {
    const home = await service.getHome(actorFor("owner"), 7);

    expect(home.period).toBe(7);
    expect(home.salesTrend).toHaveLength(7);
    expect(home.salesTrend[0]?.date).toBe("2026-10-22");
  });

  it("hides sales, orders and reports from a staff member", async () => {
    const home = await service.getHome(actorFor("staff"), 30);

    expect(reportService.getKpis).not.toHaveBeenCalled();
    expect(dailySalesService.getDailySales).not.toHaveBeenCalled();
    expect(orderService.getOrders).not.toHaveBeenCalled();
    expect(home.kpis.revenue).toBe(0);
    expect(home.kpis.revenueDeltaPct).toBeNull();
    expect(home.kpis.wasteCost).toBeNull();
    expect(home.recentOrders).toEqual([]);
    expect(home.can).toMatchObject({
      sales: false,
      orders: false,
      reports: false,
      finance: false,
      production: true,
      stock: true,
    });
    expect(home.kpis.batchesToday).toBe(1);
    expect(home.kpis.lowStockCount).toBe(1);
  });

  it("leaves the delta empty when the previous period had no revenue", async () => {
    dailySalesService.getDailySales = jest
      .fn()
      .mockImplementation(async (_actor, filters: {to: string}) => ({
        rows:
          filters.to === "2026-10-28"
            ? [saleRow("2026-10-28", "10", "1")]
            : [],
        from: new Date(),
        to: new Date(),
        canWrite: true,
      })) as never;

    const home = await service.getHome(actorFor("owner"), 7);

    expect(home.kpis.revenue).toBe(10);
    expect(home.kpis.revenueDeltaPct).toBeNull();
  });
});
