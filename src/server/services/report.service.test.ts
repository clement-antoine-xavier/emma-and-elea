import {createReportService} from "@/server/services/report.service";
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

  return {
    reportRepository,
    stockRepository,
    service: createReportService({reportRepository, stockRepository}),
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

  it("builds the report window and keeps low-stock alerts", async () => {
    const {service, reportRepository} = dependencies();

    const result = await service.getReports(actorFor("sales"));

    expect(result.summary.from).toEqual(new Date("2026-09-27T23:59:59.999Z"));
    expect(result.summary.to).toEqual(new Date("2026-10-27T23:59:59.999Z"));
    expect(result.margins).toHaveLength(1);
    expect(result.yields).toHaveLength(1);
    expect(result.alerts).toEqual([lowStock]);
    expect(reportRepository.summary).toHaveBeenCalledWith(
      "org_1",
      expect.any(Date),
      expect.any(Date),
    );
  });

  it("passes the summary through with its window", async () => {
    const {service} = dependencies();

    const result = await service.getReports(actorFor("owner"));

    expect(result.summary).toMatchObject({
      wasteCost: "5",
      productionCost: "40",
      wasteRatePct: "12.5",
      currency: "EUR",
    });
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

  it("allows the reserved accountant and auditor to read reports", async () => {
    const {service} = dependencies();

    await expect(
      service.getReports(actorFor("accountant")),
    ).resolves.toBeDefined();
    await expect(service.getReports(actorFor("auditor"))).resolves.toBeDefined();
  });
});
