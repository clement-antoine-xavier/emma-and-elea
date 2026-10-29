import {createReportService} from "@/server/services/report.service";
import type {ProfitabilityRepository} from "@/server/repositories/profitability.repository";
import type {ReportRepository} from "@/server/repositories/report.repository";
import type {StockRepository} from "@/server/repositories/stock.repository";
import type {StockLevelRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";

const lowStock: StockLevelRecord = {
  itemId: "item_1",
  itemCode: "FLOUR",
  itemName: "Flour",
  siteId: "site_1",
  siteName: "Atelier",
  unitId: "unit_kg",
  unitCode: "kg",
  quantity: "5",
  minStockQuantity: "10",
  parLevelQuantity: null,
  isBelowMin: true,
};

const healthyStock: StockLevelRecord = {
  ...lowStock,
  itemId: "item_2",
  isBelowMin: false,
};

function dependencies() {
  const reportRepository = {
    productMargins: jest.fn().mockResolvedValue([
      {
        recipeId: "recipe_1",
        recipeName: "Croissant",
        outputItemName: "Croissant",
        categoryName: null,
        costPerUnit: "1",
        salePrice: "2",
        marginPct: "50",
        currency: "EUR",
        computedAt: new Date("2026-10-26T00:00:00.000Z"),
      },
    ]),
    batchYields: jest.fn().mockResolvedValue([
      {
        id: "batch_1",
        code: "B-1",
        recipeName: "Croissant",
        plannedQuantity: "10",
        actualQuantity: "9",
        unitCode: "piece",
        yieldPct: "90",
        producedOn: new Date("2026-10-27T00:00:00.000Z"),
      },
    ]),
    summary: jest.fn().mockResolvedValue({
      wasteCost: "5",
      productionCost: "40",
      wasteRatePct: "12.5",
      currency: "EUR",
    }),
    kpis: jest.fn().mockResolvedValue({
      batchesToday: 3,
      expiringLotsCount: 2,
      wasteCost: "12.5",
      currency: "EUR",
    }),
  } as unknown as ReportRepository;
  const stockRepository = {
    listLevels: jest.fn().mockResolvedValue([lowStock, healthyStock]),
  } as unknown as StockRepository;
  const profitabilityRepository = {
    getData: jest.fn().mockResolvedValue({
      items: [],
      metrics: {},
      currency: "EUR",
    }),
  } as unknown as ProfitabilityRepository;

  return {
    reportRepository,
    stockRepository,
    profitabilityRepository,
    service: createReportService({
      reportRepository,
      stockRepository,
      profitabilityRepository,
    }),
  };
}

describe("report service", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-27T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("requires report:read", async () => {
    const {service} = dependencies();

    await expect(service.getReports(actorFor("staff"))).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(service.getKpis(null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("builds the window and hides every cost section from sales", async () => {
    const {service, reportRepository} = dependencies();

    const result = await service.getReports(actorFor("sales"));

    expect(result.from).toEqual(new Date("2026-09-27T23:59:59.999Z"));
    expect(result.to).toEqual(new Date("2026-10-27T23:59:59.999Z"));
    expect(result.summary).toBeNull();
    expect(result.margins).toEqual([]);
    expect(result.yields).toHaveLength(1);
    expect(result.alerts).toEqual([lowStock]);
    expect(result.can).toEqual({
      finance: false,
      production: true,
      stock: true,
    });
    expect(reportRepository.productMargins).not.toHaveBeenCalled();
    expect(reportRepository.summary).not.toHaveBeenCalled();
  });

  it("passes the finance summary and margins through with the window", async () => {
    const {service} = dependencies();

    const result = await service.getReports(actorFor("owner"));

    expect(result.summary).toMatchObject({
      wasteCost: "5",
      productionCost: "40",
      wasteRatePct: "12.5",
      currency: "EUR",
      from: new Date("2026-09-27T23:59:59.999Z"),
      to: new Date("2026-10-27T23:59:59.999Z"),
    });
    expect(result.margins).toHaveLength(1);
    expect(result.can.finance).toBe(true);
  });

  it("counts below-minimum levels in the KPIs", async () => {
    const {service} = dependencies();

    await expect(service.getKpis(actorFor("owner"))).resolves.toEqual({
      batchesToday: 3,
      lowStockCount: 1,
      expiringLotsCount: 2,
      wasteCost30d: "12.5",
      currency: "EUR",
    });
  });

  it("redacts waste cost from KPIs without finance access", async () => {
    const {service} = dependencies();

    await expect(service.getKpis(actorFor("sales"))).resolves.toEqual({
      batchesToday: 3,
      lowStockCount: 1,
      expiringLotsCount: 2,
      wasteCost30d: null,
      currency: "EUR",
    });
  });

  it("gives the accountant finance and the auditor operations only", async () => {
    const {service} = dependencies();

    const accountant = await service.getReports(actorFor("accountant"));
    expect(accountant.can.finance).toBe(true);
    expect(accountant.summary).not.toBeNull();
    expect(accountant.margins).toHaveLength(1);

    const auditor = await service.getReports(actorFor("auditor"));
    expect(auditor.can.finance).toBe(false);
    expect(auditor.summary).toBeNull();
    expect(auditor.margins).toEqual([]);
    expect(auditor.yields).toHaveLength(1);
    expect(auditor.alerts).toEqual([lowStock]);
  });
});
