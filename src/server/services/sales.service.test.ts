import type {OrgRole} from "@/lib/permissions";
import type {Actor, OrganizationActor} from "@/server/auth/types";
import type {CustomerRepository} from "@/server/repositories/customer.repository";
import type {OrderRepository} from "@/server/repositories/order.repository";
import type {DispatchRepository} from "@/server/repositories/dispatch.repository";
import type {SalesRepository} from "@/server/repositories/sales.repository";
import type {ReportRepository} from "@/server/repositories/report.repository";
import type {StockRepository} from "@/server/repositories/stock.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {CostingRepository} from "@/server/repositories/costing.repository";
import type {StockLevelRecord} from "@/lib/dto";
import {createOrderService} from "./order.service";
import {createDispatchService} from "./dispatch.service";
import {createDailySalesService} from "./daily-sales.service";
import {createReportService} from "./report.service";
import {createCustomerService} from "./customer.service";

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

const customer = {
  id: "customer_1",
  code: "CAF",
  name: "Café du Coin",
  type: "BUSINESS" as const,
  contactName: null,
  email: null,
  phone: null,
  city: "Lyon",
  vatNumber: null,
  note: null,
  isArchived: false,
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

const massUnit = {
  id: "unit_kg",
  code: "kg",
  labelEn: "kilogram",
  labelFr: "kilogramme",
  kind: "MASS" as const,
  isBase: true,
};

const grammarUnit = {
  id: "unit_g",
  code: "g",
  labelEn: "gram",
  labelFr: "gramme",
  kind: "MASS" as const,
  isBase: false,
};

const volumeUnit = {
  id: "unit_l",
  code: "L",
  labelEn: "litre",
  labelFr: "litre",
  kind: "VOLUME" as const,
  isBase: true,
};

const item = {
  id: "item_1",
  code: "BAG",
  name: "Baguette",
  type: "FINISHED" as const,
  stockUnitId: "unit_kg",
};

function customerRepository(
  overrides: Partial<CustomerRepository> = {},
): CustomerRepository {
  return {
    list: jest.fn().mockResolvedValue([customer]),
    find: jest.fn().mockResolvedValue(customer),
    create: jest.fn().mockResolvedValue("customer_1"),
    update: jest.fn().mockResolvedValue(true),
    archive: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as CustomerRepository;
}

function orderRepository(
  overrides: Partial<OrderRepository> = {},
): OrderRepository {
  return {
    list: jest.fn().mockResolvedValue({orders: [], total: 0}),
    find: jest.fn().mockResolvedValue(null),
    findSummary: jest.fn().mockResolvedValue({
      id: "order_1",
      status: "CONFIRMED",
      customerId: "customer_1",
    }),
    create: jest.fn().mockResolvedValue("order_1"),
    addLine: jest.fn().mockResolvedValue(undefined),
    removeLine: jest.fn().mockResolvedValue(undefined),
    confirm: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as OrderRepository;
}

function siteRepository(): SiteRepository {
  return {
    list: jest.fn().mockResolvedValue([site]),
    findById: jest.fn().mockResolvedValue(site),
  } as unknown as SiteRepository;
}

function catalogRepository(
  overrides: Partial<CatalogRepository> = {},
): CatalogRepository {
  return {
    listUnits: jest
      .fn()
      .mockResolvedValue([massUnit, grammarUnit, volumeUnit]),
    findUnit: jest.fn().mockImplementation((id: string) => {
      if (id === "unit_g") return Promise.resolve(grammarUnit);
      if (id === "unit_l") return Promise.resolve(volumeUnit);
      return Promise.resolve(massUnit);
    }),
    listItemOptions: jest.fn().mockResolvedValue([item]),
    ...overrides,
  } as unknown as CatalogRepository;
}

function costingRepository(): CostingRepository {
  return {
    getSettings: jest.fn().mockResolvedValue({
      currency: "EUR",
      overheadPct: "0",
      defaultLabourRateId: null,
    }),
  } as unknown as CostingRepository;
}

function dispatchRepository(
  overrides: Partial<DispatchRepository> = {},
): DispatchRepository {
  return {
    list: jest.fn().mockResolvedValue({dispatches: [], total: 0}),
    find: jest.fn().mockResolvedValue({
      id: "dispatch_1",
      status: "DRAFT",
      siteId: "site_1",
    }),
    create: jest.fn().mockResolvedValue("dispatch_1"),
    addLine: jest.fn().mockResolvedValue(undefined),
    removeLine: jest.fn().mockResolvedValue(undefined),
    post: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    findLot: jest.fn().mockResolvedValue({
      id: "lot_1",
      siteId: "site_1",
      itemId: "item_1",
      itemName: "Baguette",
      unitId: "unit_kg",
      unitCode: "kg",
      quantityRemaining: "5",
    }),
    options: jest.fn().mockResolvedValue({
      customers: [],
      sites: [],
      orders: [],
      lots: [],
    }),
    ...overrides,
  } as unknown as DispatchRepository;
}

describe("order service", () => {
  function service(overrides: {
    orders?: Partial<OrderRepository>;
    customers?: Partial<CustomerRepository>;
    catalog?: Partial<CatalogRepository>;
  } = {}) {
    return createOrderService({
      orderRepository: orderRepository(overrides.orders),
      customerRepository: customerRepository(overrides.customers),
      siteRepository: siteRepository(),
      catalogRepository: catalogRepository(overrides.catalog),
      costingRepository: costingRepository(),
    });
  }

  it("creates a draft order with the organization currency", async () => {
    const orders = orderRepository();
    const orderService = service({orders});
    const requestedFor = new Date("2026-11-02T00:00:00.000Z");

    await orderService.createOrder(actorFor("sales"), {
      customerId: "customer_1",
      siteId: "site_1",
      requestedFor,
      note: null,
    });

    expect(orders.create).toHaveBeenCalledWith("org_1", {
      customerId: "customer_1",
      siteId: "site_1",
      requestedFor,
      currency: "EUR",
      note: null,
    });
  });

  it("rejects orders from roles without order:write", async () => {
    const orderService = service();

    await expect(
      orderService.createOrder(actorFor("staff"), {
        customerId: "customer_1",
        siteId: "site_1",
        requestedFor: new Date(),
        note: null,
      }),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("rejects a line whose unit kind differs from the stock unit", async () => {
    const orders = orderRepository();
    const orderService = service({orders});

    await expect(
      orderService.addLine(actorFor("sales"), "order_1", {
        itemId: "item_1",
        quantity: "2",
        unitId: "unit_l",
        unitPrice: "5",
        note: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_UNIT"});
    expect(orders.addLine).not.toHaveBeenCalled();
  });

  it("adds a compatible line", async () => {
    const orders = orderRepository();
    const orderService = service({orders});

    await orderService.addLine(actorFor("sales"), "order_1", {
      itemId: "item_1",
      quantity: "500",
      unitId: "unit_g",
      unitPrice: "0.01",
      note: null,
    });

    expect(orders.addLine).toHaveBeenCalledWith("org_1", "order_1", {
      itemId: "item_1",
      quantity: "500",
      unitId: "unit_g",
      unitPrice: "0.01",
      note: null,
    });
  });

  it("refuses to confirm an order without lines", async () => {
    const orders = orderRepository({
      find: jest.fn().mockResolvedValue({
        id: "order_1",
        status: "DRAFT",
        lines: [],
      }),
    });
    const orderService = service({orders});

    await expect(
      orderService.confirmOrder(actorFor("sales"), "order_1"),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
    expect(orders.confirm).not.toHaveBeenCalled();
  });
});

describe("dispatch service", () => {
  function service(overrides: {
    dispatches?: Partial<DispatchRepository>;
    orders?: Partial<OrderRepository>;
  } = {}) {
    return createDispatchService({
      dispatchRepository: dispatchRepository(overrides.dispatches),
      customerRepository: customerRepository(),
      siteRepository: siteRepository(),
      orderRepository: orderRepository(overrides.orders),
    });
  }

  it("rejects a lot from another site", async () => {
    const dispatches = dispatchRepository({
      findLot: jest.fn().mockResolvedValue({
        id: "lot_1",
        siteId: "site_2",
        itemId: "item_1",
        itemName: "Baguette",
        unitId: "unit_kg",
        unitCode: "kg",
        quantityRemaining: "5",
      }),
    });
    const dispatchService = service({dispatches});

    await expect(
      dispatchService.addLine(actorFor("sales"), "dispatch_1", {
        lotId: "lot_1",
        quantity: "1",
        unitPrice: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("rejects more than the lot has left", async () => {
    const dispatchService = service();

    await expect(
      dispatchService.addLine(actorFor("sales"), "dispatch_1", {
        lotId: "lot_1",
        quantity: "6",
        unitPrice: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "INSUFFICIENT_STOCK"});
  });

  it("takes the item and unit from the lot", async () => {
    const dispatches = dispatchRepository();
    const dispatchService = service({dispatches});

    await dispatchService.addLine(actorFor("sales"), "dispatch_1", {
      lotId: "lot_1",
      quantity: "2",
      unitPrice: "3.5",
      note: null,
    });

    expect(dispatches.addLine).toHaveBeenCalledWith("org_1", "dispatch_1", {
      lotId: "lot_1",
      itemId: "item_1",
      unitId: "unit_kg",
      quantity: "2",
      unitPrice: "3.5",
      note: null,
    });
  });

  it("only links orders that can be dispatched", async () => {
    const dispatchService = service({
      orders: {
        findSummary: jest.fn().mockResolvedValue({
          id: "order_1",
          status: "DRAFT",
          customerId: "customer_1",
        }),
      },
    });

    await expect(
      dispatchService.createDispatch(actorFor("sales"), {
        siteId: "site_1",
        customerId: null,
        orderId: "order_1",
        carrier: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("copies the order customer when no customer is chosen", async () => {
    const dispatches = dispatchRepository();
    const dispatchService = service({dispatches});

    await dispatchService.createDispatch(actorFor("sales"), {
      siteId: "site_1",
      customerId: null,
      orderId: "order_1",
      carrier: null,
      note: null,
    });

    expect(dispatches.create).toHaveBeenCalledWith("org_1", {
      siteId: "site_1",
      customerId: "customer_1",
      orderId: "order_1",
      carrier: null,
      note: null,
    });
  });
});

describe("daily sales service", () => {
  function service(sales: Partial<SalesRepository> = {}) {
    return createDailySalesService({
      salesRepository: {
        list: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue(undefined),
        ...sales,
      } as unknown as SalesRepository,
      catalogRepository: catalogRepository(),
      siteRepository: siteRepository(),
      costingRepository: costingRepository(),
    });
  }

  it("stores the item stock unit and organization currency", async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const dailySales = service({upsert});
    const businessDate = new Date("2026-10-27T00:00:00.000Z");

    await dailySales.recordDailySales(actorFor("sales"), {
      siteId: "site_1",
      itemId: "item_1",
      businessDate,
      channel: "RETAIL",
      quantitySold: "12",
      revenue: "48",
      note: null,
    });

    expect(upsert).toHaveBeenCalledWith("org_1", {
      siteId: "site_1",
      itemId: "item_1",
      businessDate,
      channel: "RETAIL",
      quantitySold: "12",
      revenue: "48",
      currency: "EUR",
      unitId: "unit_kg",
      note: null,
    });
  });

  it("rejects writes from read-only roles", async () => {
    const dailySales = service();

    await expect(
      dailySales.recordDailySales(actorFor("stock_manager"), {
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
});

describe("report service", () => {
  const belowMin = {
    siteId: "site_1",
    siteName: "Atelier",
    itemId: "item_1",
    itemCode: "BAG",
    itemName: "Baguette",
    quantity: "1",
    unitCode: "kg",
    minStockQuantity: "5",
    isBelowMin: true,
  } as unknown as StockLevelRecord;
  const healthy = {...belowMin, itemId: "item_2", isBelowMin: false};

  function service() {
    const reports = {
      productMargins: jest.fn().mockResolvedValue([]),
      batchYields: jest.fn().mockResolvedValue([]),
      summary: jest.fn().mockResolvedValue({
        wasteCost: "10",
        productionCost: "90",
        wasteRatePct: "10",
        currency: "EUR",
      }),
      kpis: jest.fn().mockResolvedValue({
        batchesToday: 3,
        expiringLotsCount: 2,
        wasteCost: "10",
        currency: "EUR",
      }),
    } as unknown as ReportRepository;
    const stocks = {
      listLevels: jest.fn().mockResolvedValue([belowMin, healthy]),
    } as unknown as StockRepository;

    return createReportService({
      reportRepository: reports,
      stockRepository: stocks,
    });
  }

  it("counts only items below their minimum in the KPIs", async () => {
    const kpis = await service().getKpis(actorFor("owner"));

    expect(kpis).toEqual({
      batchesToday: 3,
      lowStockCount: 1,
      expiringLotsCount: 2,
      wasteCost30d: "10",
      currency: "EUR",
    });
  });

  it("returns only non-financial sections to sales", async () => {
    const report = await service().getReports(actorFor("sales"));

    expect(report.alerts).toHaveLength(1);
    expect(report.summary).toBeNull();
    expect(report.margins).toEqual([]);
  });

  it("rejects roles without report:read", async () => {
    await expect(
      service().getReports(actorFor("staff") as Actor),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});

describe("customer service", () => {
  it("creates customers for sales roles", async () => {
    const customers = customerRepository();
    const service = createCustomerService({customerRepository: customers});

    const result = await service.createCustomer(actorFor("sales"), {
      code: "CAF",
      name: "Café du Coin",
      type: "BUSINESS",
      contactName: null,
      email: null,
      phone: null,
      city: null,
      vatNumber: null,
      note: null,
    });

    expect(result).toEqual({id: "customer_1"});
    expect(customers.create).toHaveBeenCalled();
  });

  it("rejects customer writes from stock managers", async () => {
    const service = createCustomerService({
      customerRepository: customerRepository(),
    });

    await expect(
      service.createCustomer(actorFor("stock_manager"), {
        code: null,
        name: "Café du Coin",
        type: "BUSINESS",
        contactName: null,
        email: null,
        phone: null,
        city: null,
        vatNumber: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});
