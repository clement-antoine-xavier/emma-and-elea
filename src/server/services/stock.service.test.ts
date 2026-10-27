import {createStockService} from "@/server/services/stock.service";
import type {StockRepository} from "@/server/repositories/stock.repository";
import type {LotSummaryRecord, StockLevelRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";

const level = (overrides: Partial<StockLevelRecord> = {}): StockLevelRecord => ({
  itemId: "item_1",
  itemCode: "FLOUR",
  itemName: "Flour",
  siteId: "site_1",
  siteName: "Atelier",
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
    listLots: jest.fn().mockResolvedValue({lots: [lot], total: 1}),
    findLot: jest.fn().mockResolvedValue({...lot, quantityReceived: "10", movements: []}),
    ...overrides,
  };
}

describe("stock service", () => {
  it("requires a member with stock:read", async () => {
    const service = createStockService({stockRepository: repository()});

    await expect(service.getLevels(null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(service.getLevels(actorFor("sales"))).resolves.toBeDefined();
  });

  it("splits levels into all rows and below-minimum alerts", async () => {
    const service = createStockService({stockRepository: repository()});

    const result = await service.getLevels(actorFor("staff"));

    expect(result.levels).toHaveLength(2);
    expect(result.alerts).toEqual([level()]);
  });

  it("parses lot filters and builds a page", async () => {
    const repo = repository();
    const service = createStockService({stockRepository: repo});

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
    const service = createStockService({stockRepository: repo});

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
    const service = createStockService({stockRepository: repository()});

    await expect(
      service.getLot(actorFor("staff"), "lot_1"),
    ).resolves.toMatchObject({id: "lot_1", quantityReceived: "10"});

    const missing = createStockService({
      stockRepository: repository({findLot: jest.fn().mockResolvedValue(null)}),
    });
    await expect(
      missing.getLot(actorFor("staff"), "missing"),
    ).resolves.toBeNull();
  });

  it("requires a member with stock:read for lots and lot details", async () => {
    const service = createStockService({stockRepository: repository()});

    await expect(service.getLots(null, {})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(service.getLot(null, "lot_1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
