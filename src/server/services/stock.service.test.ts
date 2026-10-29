import {createStockService} from "@/server/services/stock.service";
import type {StockRepository} from "@/server/repositories/stock.repository";
import type {SupplierRepository} from "@/server/repositories/supplier.repository";
import type {LotSummaryRecord, StockLevelRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";

const level = (overrides: Partial<StockLevelRecord> = {}): StockLevelRecord => ({
  itemId: "item_1",
  itemCode: "FLOUR",
  itemName: "Flour",
  siteId: "site_1",
  siteName: "Atelier",
  unitId: "unit_kg",
  unitCode: "kg",
  quantity: "5",
  minStockQuantity: "10",
  parLevelQuantity: "20",
  isBelowMin: true,
  ...overrides,
});

const lot: LotSummaryRecord = {
  id: "lot_1",
  lotNumber: "ATL-261027-1",
  itemId: "item_1",
  itemCode: "FLOUR",
  itemName: "Flour",
  siteId: "site_1",
  siteName: "Atelier",
  quantityRemaining: "5",
  unitCode: "kg",
  unitCost: "1.1",
  currency: "EUR",
  receivedAt: new Date("2026-10-01T00:00:00.000Z"),
  expiresOn: null,
  status: "AVAILABLE",
};

function repository(
  overrides: Partial<StockRepository> = {},
): StockRepository {
  return {
    listLevels: jest.fn().mockResolvedValue([level(), level({itemId: "item_2", isBelowMin: false})]),
    openDraftQuantities: jest.fn().mockResolvedValue({}),
    listLots: jest.fn().mockResolvedValue({lots: [lot], total: 1}),
    findLot: jest.fn().mockResolvedValue({...lot, quantityReceived: "10", movements: []}),
    ...overrides,
  };
}

function supplierRepository(): SupplierRepository {
  return {
    preferredPrices: jest.fn().mockResolvedValue({}),
  } as unknown as SupplierRepository;
}

function buildService(
  repo: StockRepository = repository(),
  suppliers: SupplierRepository = supplierRepository(),
) {
  return createStockService({
    stockRepository: repo,
    supplierRepository: suppliers,
  });
}

describe("stock service", () => {
  it("requires a member with stock:read", async () => {
    const service = buildService();

    await expect(service.getLevels(null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(service.getLevels(actorFor("sales"))).resolves.toBeDefined();
  });

  it("splits levels into all rows and below-minimum alerts", async () => {
    const service = buildService();

    const result = await service.getLevels(actorFor("staff"));

    expect(result.levels).toHaveLength(2);
    expect(result.alerts).toEqual([level()]);
  });

  it("parses lot filters and builds a page", async () => {
    const repo = repository();
    const service = buildService(repo);

    const result = await service.getLots(actorFor("stock_manager"), {
      search: " flour ",
      includeEmpty: "true",
      page: "2",
      pageSize: "10",
    });

    expect(repo.listLots).toHaveBeenCalledWith("org_1", {
      search: "flour",
      includeEmpty: true,
      skip: 10,
      take: 10,
    });
    expect(result).toEqual({
      page: {items: [lot], total: 1, page: 2, pageSize: 10},
      filters: {search: "flour", includeEmpty: true},
    });
  });

  it("defaults includeEmpty to false and clamps a bad page size", async () => {
    const repo = repository();
    const service = buildService(repo);

    const result = await service.getLots(actorFor("stock_manager"), {
      page: "-4",
      pageSize: "0",
    });

    expect(result.page.page).toBe(1);
    expect(result.page.pageSize).toBe(1);
    expect(result.filters).toEqual({search: "", includeEmpty: false});
    expect(repo.listLots).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({includeEmpty: false, skip: 0}),
    );
  });

  it("reads a lot by id", async () => {
    const service = buildService();

    await expect(
      service.getLot(actorFor("staff"), "lot_1"),
    ).resolves.toMatchObject({id: "lot_1", quantityReceived: "10"});

    const missing = buildService(
      repository({findLot: jest.fn().mockResolvedValue(null)}),
    );
    await expect(
      missing.getLot(actorFor("staff"), "missing"),
    ).resolves.toBeNull();
  });

  it("suggests par minus on hand and open drafts", async () => {
    const repo = repository({
      openDraftQuantities: jest
        .fn()
        .mockResolvedValue({"site_1:item_1": "2"}),
    });
    const suppliers = {
      preferredPrices: jest.fn().mockResolvedValue({
        item_1: {
          supplierId: "supplier_1",
          supplierName: "Mill",
          unitCostPerStockUnit: "1.1",
          currency: "EUR",
        },
      }),
    } as unknown as SupplierRepository;

    const result = await buildService(repo, suppliers).getReplenishment(
      actorFor("stock_manager"),
    );

    expect(result.canWrite).toBe(true);
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: "item_1",
          suggestedQuantity: "13",
          openDraftQuantity: "2",
          supplierName: "Mill",
          unitPrice: "1.1",
        }),
      ]),
    );
  });

  it("requires a member with stock:read for lots and lot details", async () => {
    const service = buildService();

    await expect(service.getLots(null, {})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(service.getLot(null, "lot_1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
