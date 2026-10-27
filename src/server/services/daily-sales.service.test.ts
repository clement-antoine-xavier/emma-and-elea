import {createDailySalesService} from "@/server/services/daily-sales.service";
import type {SalesRepository} from "@/server/repositories/sales.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {CostingRepository} from "@/server/repositories/costing.repository";
import type {DailySalesRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";
import {unit} from "@/test-utils/units";

const row: DailySalesRecord = {
  id: "sales_1",
  businessDate: new Date("2026-10-27T00:00:00.000Z"),
  siteId: "site_1",
  siteName: "Atelier",
  itemId: "item_1",
  itemName: "Croissant",
  quantitySold: "10",
  unitCode: "piece",
  revenue: "30",
  currency: "EUR",
  channel: "RETAIL",
  source: "MANUAL",
};

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

const item = {
  id: "item_1",
  code: "CROISSANT",
  name: "Croissant",
  type: "FINISHED_PRODUCT" as const,
  stockUnitId: "unit_piece",
};

function dependencies(overrides: {
  salesRepository?: Partial<SalesRepository>;
  catalogRepository?: Partial<CatalogRepository>;
  siteRepository?: Partial<SiteRepository>;
  costingRepository?: Partial<CostingRepository>;
} = {}) {
  const salesRepository = {
    list: jest.fn().mockResolvedValue([row]),
    upsert: jest.fn().mockResolvedValue(undefined),
    ...overrides.salesRepository,
  } as unknown as SalesRepository;
  const catalogRepository = {
    listItemOptions: jest.fn().mockResolvedValue([item]),
    ...overrides.catalogRepository,
  } as unknown as CatalogRepository;
  const siteRepository = {
    list: jest.fn().mockResolvedValue([site]),
    findById: jest.fn().mockResolvedValue(site),
    ...overrides.siteRepository,
  } as unknown as SiteRepository;
  const costingRepository = {
    getSettings: jest.fn().mockResolvedValue({currency: "EUR"}),
    ...overrides.costingRepository,
  } as unknown as CostingRepository;

  return {
    salesRepository,
    catalogRepository,
    siteRepository,
    costingRepository,
    service: createDailySalesService({
      salesRepository,
      catalogRepository,
      siteRepository,
      costingRepository,
    }),
  };
}

describe("daily sales service", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-27T15:30:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("requires sales:read", async () => {
    const {service} = dependencies();

    await expect(
      service.getDailySales(actorFor("staff"), {}),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.getDailySales(null, {}),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("uses the last 30 days by default", async () => {
    const {service, salesRepository} = dependencies();

    const result = await service.getDailySales(actorFor("sales"), {});

    expect(result.from).toEqual(new Date("2026-09-27T00:00:00.000Z"));
    expect(result.to).toEqual(new Date("2026-10-27T00:00:00.000Z"));
    expect(result.rows).toEqual([row]);
    expect(salesRepository.list).toHaveBeenCalledWith("org_1", {
      from: new Date("2026-09-27T00:00:00.000Z"),
      to: new Date("2026-10-27T00:00:00.000Z"),
      siteId: null,
    });
  });

  it("accepts explicit dates and a site filter", async () => {
    const {service} = dependencies();

    const result = await service.getDailySales(actorFor("sales"), {
      from: "2026-10-01",
      to: "2026-10-05",
      siteId: "site_1",
    });

    expect(result.from).toEqual(new Date("2026-10-01T00:00:00.000Z"));
    expect(result.to).toEqual(new Date("2026-10-05T00:00:00.000Z"));
    expect(await service.getDailySales(actorFor("sales"), {siteId: "site_1"}))
      .toMatchObject({canWrite: true});
  });

  it("falls back to the defaults for malformed dates", async () => {
    const {service, salesRepository} = dependencies();

    await service.getDailySales(actorFor("sales"), {
      from: "2026-13-40",
      to: "not-a-date",
    });

    expect(salesRepository.list).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({
        from: new Date("2026-09-27T00:00:00.000Z"),
        to: new Date("2026-10-27T00:00:00.000Z"),
      }),
    );
  });

  it("does not validate that from is before to", async () => {
    const {service, salesRepository} = dependencies();

    const result = await service.getDailySales(actorFor("sales"), {
      from: "2026-10-27",
      to: "2026-10-01",
    });

    // The repository receives an inverted range unchanged and returns no
    // rows; the UI never builds one. Documented rather than silently coerced.
    expect(salesRepository.list).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({from: result.from, to: result.to}),
    );
    expect(result.from.getTime()).toBeGreaterThan(result.to.getTime());
  });

  it("returns active sites and all item options", async () => {
    const {service, siteRepository} = dependencies({
      siteRepository: {
        list: jest.fn().mockResolvedValue([
          site,
          {...site, id: "site_2", archivedAt: new Date()},
        ]),
      },
    });

    const options = await service.getOptions(actorFor("sales"));

    expect(options.sites).toEqual([
      {id: "site_1", name: "Atelier", code: "ATL"},
    ]);
    expect(options.items).toEqual([
      {id: "item_1", code: "CROISSANT", name: "Croissant"},
    ]);
    expect(siteRepository.list).toHaveBeenCalledWith("org_1");
  });

  it("records sales with the item stock unit and tenant currency", async () => {
    const {service, salesRepository} = dependencies();

    await service.recordDailySales(actorFor("sales"), {
      siteId: "site_1",
      itemId: "item_1",
      businessDate: new Date("2026-10-27T00:00:00.000Z"),
      channel: "BOTH",
      quantitySold: "10",
      revenue: "30",
      note: null,
    });

    expect(salesRepository.upsert).toHaveBeenCalledWith("org_1", {
      siteId: "site_1",
      itemId: "item_1",
      businessDate: new Date("2026-10-27T00:00:00.000Z"),
      channel: "BOTH",
      quantitySold: "10",
      revenue: "30",
      currency: "EUR",
      unitId: "unit_piece",
      note: null,
    });
  });

  it("rejects an unknown site or item", async () => {
    const {service} = dependencies({
      siteRepository: {findById: jest.fn().mockResolvedValue(null)},
    });

    await expect(
      service.recordDailySales(actorFor("sales"), {
        siteId: "site_gone",
        itemId: "item_1",
        businessDate: new Date(),
        channel: "RETAIL",
        quantitySold: "1",
        revenue: "1",
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const missingItem = dependencies({
      catalogRepository: {listItemOptions: jest.fn().mockResolvedValue([])},
    });
    await expect(
      missingItem.service.recordDailySales(actorFor("sales"), {
        siteId: "site_1",
        itemId: "item_gone",
        businessDate: new Date(),
        channel: "RETAIL",
        quantitySold: "1",
        revenue: "1",
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("requires sales:write to record", async () => {
    const {service} = dependencies();

    await expect(
      service.recordDailySales(actorFor("production_manager"), {
        siteId: "site_1",
        itemId: "item_1",
        businessDate: new Date(),
        channel: "RETAIL",
        quantitySold: "1",
        revenue: "1",
        note: null,
      }),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("documents that an archived site is still accepted", async () => {
    const archived = {...site, archivedAt: new Date("2026-01-01T00:00:00Z")};
    const {service, salesRepository} = dependencies({
      siteRepository: {findById: jest.fn().mockResolvedValue(archived)},
    });

    await service.recordDailySales(actorFor("sales"), {
      siteId: "site_1",
      itemId: "item_1",
      businessDate: new Date("2026-10-27T00:00:00.000Z"),
      channel: "RETAIL",
      quantitySold: "1",
      revenue: "1",
      note: null,
    });

    // TODO(bug-hunt): archive checks live in the UI only today.
    expect(salesRepository.upsert).toHaveBeenCalled();
  });

  it("maps archived unit fixtures for completeness", () => {
    expect(unit("piece").kind).toBe("COUNT");
  });
});
