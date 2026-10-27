import type {OrgRole} from "@/lib/permissions";
import type {OrganizationActor} from "@/server/auth/types";
import type {StockCountRepository} from "@/server/repositories/stock-count.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {StockCountDetailRecord} from "@/lib/dto";
import {createStockCountService} from "./stock-count.service";

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

const count: StockCountDetailRecord = {
  id: "count_1",
  siteId: "site_1",
  siteName: "Atelier",
  status: "DRAFT",
  countedAt: new Date("2026-11-02T00:00:00.000Z"),
  postedAt: null,
  lineCount: 1,
  createdAt: new Date("2026-11-02T00:00:00.000Z"),
  note: null,
  lines: [
    {
      id: "line_1",
      lotId: "lot_1",
      lotNumber: "LOT-1",
      itemId: "item_1",
      itemCode: "FLO",
      itemName: "Flour",
      expectedQuantity: "10",
      countedQuantity: "10",
      variance: "0",
      unitId: "unit_kg",
      unitCode: "kg",
      note: null,
    },
  ],
};

function stockCountRepository(
  overrides: Partial<StockCountRepository> = {},
): StockCountRepository {
  return {
    listCounts: jest.fn().mockResolvedValue([]),
    findCount: jest.fn().mockResolvedValue(count),
    findDraft: jest.fn().mockResolvedValue(null),
    createCount: jest.fn().mockResolvedValue("count_1"),
    updateLines: jest.fn().mockResolvedValue(undefined),
    post: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as StockCountRepository;
}

function siteRepository(): SiteRepository {
  return {
    list: jest.fn().mockResolvedValue([site]),
    findById: jest.fn().mockResolvedValue(site),
  } as unknown as SiteRepository;
}

function service(
  stock: Partial<StockCountRepository> = {},
) {
  return createStockCountService({
    stockCountRepository: stockCountRepository(stock),
    siteRepository: siteRepository(),
  });
}

describe("stock count service", () => {
  it("creates a draft with the site local date", async () => {
    const stock = stockCountRepository();
    const stockCountService = service(stock);

    await stockCountService.createCount(actorFor("stock_manager"), {
      siteId: "site_1",
      countedAt: new Date("2026-11-02T00:00:00.000Z"),
      note: null,
    });

    expect(stock.createCount).toHaveBeenCalledWith("org_1", {
      siteId: "site_1",
      countedAt: new Date("2026-11-02T00:00:00.000Z"),
      note: null,
      userId: "user_1",
    });
  });

  it("refuses a second draft for the same site and day", async () => {
    await expect(
      service({
        findDraft: jest.fn().mockResolvedValue({
          id: "count_1",
          siteId: "site_1",
          siteName: "Atelier",
          status: "DRAFT",
          countedAt: new Date("2026-11-02T00:00:00.000Z"),
          postedAt: null,
          lineCount: 1,
          createdAt: new Date(),
        }),
      }).createCount(actorFor("stock_manager"), {
        siteId: "site_1",
        countedAt: new Date("2026-11-02T00:00:00.000Z"),
        note: null,
      }),
    ).rejects.toMatchObject({code: "CONFLICT"});
  });

  it("computes the variance from the expected quantity", async () => {
    const stock = stockCountRepository();
    const stockCountService = service(stock);

    await stockCountService.updateLines(actorFor("stock_manager"), "count_1", [
      {id: "line_1", countedQuantity: "8"},
    ]);

    expect(stock.updateLines).toHaveBeenCalledWith("org_1", "count_1", [
      {id: "line_1", countedQuantity: "8", variance: "-2"},
    ]);
  });

  it("lets staff count but not post", async () => {
    const stock = stockCountRepository();
    const stockCountService = service(stock);

    await stockCountService.updateLines(actorFor("staff"), "count_1", [
      {id: "line_1", countedQuantity: "9"},
    ]);
    expect(stock.updateLines).toHaveBeenCalled();

    await expect(
      stockCountService.postCount(actorFor("staff"), "count_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("posts as a stock writer", async () => {
    const stock = stockCountRepository();
    const stockCountService = service(stock);

    await stockCountService.postCount(actorFor("stock_manager"), "count_1");

    expect(stock.post).toHaveBeenCalledWith("org_1", "count_1", "user_1");
  });
});
