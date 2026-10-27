import {createOrderService} from "@/server/services/order.service";
import type {OrderRepository} from "@/server/repositories/order.repository";
import type {CustomerRepository} from "@/server/repositories/customer.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {CostingRepository} from "@/server/repositories/costing.repository";
import type {OrderDetailRecord, OrderSummaryRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";
import {unit} from "@/test-utils/units";

const summary: OrderSummaryRecord = {
  id: "order_1",
  number: "SO-1",
  customerName: "Acme",
  siteName: "Atelier",
  status: "DRAFT",
  requestedFor: new Date("2026-10-28T00:00:00.000Z"),
  totalAmount: "10",
  currency: "EUR",
  lineCount: 1,
  createdAt: new Date("2026-10-27T10:00:00.000Z"),
};

const detail: OrderDetailRecord = {
  ...summary,
  customerId: "customer_1",
  siteId: "site_1",
  note: null,
  lines: [
    {
      id: "line_1",
      itemId: "item_croissant",
      itemCode: "CROISSANT",
      itemName: "Croissant",
      quantity: "5",
      unitCode: "piece",
      unitPrice: "2",
      fulfilledQuantity: "0",
      note: null,
    },
  ],
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

const customer = {
  id: "customer_1",
  code: "ACME",
  name: "Acme",
  type: "BUSINESS" as const,
  contactName: null,
  email: null,
  phone: null,
  city: null,
  vatNumber: null,
  note: null,
  isArchived: false,
};

const itemOption = {
  id: "item_croissant",
  code: "CROISSANT",
  name: "Croissant",
  type: "FINISHED_PRODUCT" as const,
  stockUnitId: "unit_piece",
};

function dependencies(overrides: {
  orderRepository?: Partial<OrderRepository>;
  customerRepository?: Partial<CustomerRepository>;
  siteRepository?: Partial<SiteRepository>;
  catalogRepository?: Partial<CatalogRepository>;
  costingRepository?: Partial<CostingRepository>;
} = {}) {
  const orderRepository = {
    list: jest.fn().mockResolvedValue({orders: [summary], total: 1}),
    find: jest.fn().mockResolvedValue(detail),
    findSummary: jest.fn().mockResolvedValue({
      id: "order_1",
      status: "DRAFT",
      customerId: "customer_1",
    }),
    create: jest.fn().mockResolvedValue("order_1"),
    addLine: jest.fn().mockResolvedValue(undefined),
    removeLine: jest.fn().mockResolvedValue(undefined),
    confirm: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    ...overrides.orderRepository,
  } as unknown as OrderRepository;
  const customerRepository = {
    list: jest.fn().mockResolvedValue([customer]),
    find: jest.fn().mockResolvedValue(customer),
    ...overrides.customerRepository,
  } as unknown as CustomerRepository;
  const siteRepository = {
    list: jest.fn().mockResolvedValue([site]),
    findById: jest.fn().mockResolvedValue(site),
    ...overrides.siteRepository,
  } as unknown as SiteRepository;
  const catalogRepository = {
    listItemOptions: jest.fn().mockResolvedValue([itemOption]),
    listUnits: jest.fn().mockResolvedValue([unit("piece"), unit("kg")]),
    findUnit: jest.fn().mockImplementation(async (id: string) => {
      if (id === "unit_piece") return unit("piece");
      if (id === "unit_kg") return unit("kg");
      return null;
    }),
    ...overrides.catalogRepository,
  } as unknown as CatalogRepository;
  const costingRepository = {
    getSettings: jest.fn().mockResolvedValue({currency: "EUR"}),
    ...overrides.costingRepository,
  } as unknown as CostingRepository;

  return {
    orderRepository,
    customerRepository,
    siteRepository,
    catalogRepository,
    service: createOrderService({
      orderRepository,
      customerRepository,
      siteRepository,
      catalogRepository,
      costingRepository,
    }),
  };
}

describe("order service", () => {
  it("requires a member with order:read", async () => {
    const {service} = dependencies();

    await expect(service.getOrders(null, {})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      service.getOrders(actorFor("staff"), {}),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("lists orders with parsed filters and pagination", async () => {
    const {service, orderRepository} = dependencies();

    const result = await service.getOrders(actorFor("sales"), {
      search: " acme ",
      status: "DRAFT",
      page: "2",
      pageSize: "5",
    });

    expect(orderRepository.list).toHaveBeenCalledWith("org_1", {
      search: "acme",
      status: "DRAFT",
      skip: 5,
      take: 5,
    });
    expect(result).toEqual({
      page: {items: [summary], total: 1, page: 2, pageSize: 5},
      canWrite: true,
      filters: {search: "acme", status: "DRAFT"},
    });
  });

  it("drops an unknown status filter", async () => {
    const {service, orderRepository} = dependencies();

    const result = await service.getOrders(actorFor("sales"), {
      status: "SHIPPED",
    });

    expect(orderRepository.list).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({status: null}),
    );
    expect(result.filters.status).toBeNull();
  });

  it("returns an order or null and reflects read-only access", async () => {
    const {service} = dependencies();

    await expect(
      service.getOrder(actorFor("sales"), "order_1"),
    ).resolves.toEqual({order: detail, canWrite: true});
    await expect(
      service.getOrder(actorFor("production_manager"), "order_1"),
    ).resolves.toMatchObject({canWrite: false});

    const empty = dependencies({
      orderRepository: {find: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      empty.service.getOrder(actorFor("sales"), "missing"),
    ).resolves.toBeNull();
  });

  it("builds options from active customers and sites", async () => {
    const {service} = dependencies({
      customerRepository: {
        list: jest.fn().mockResolvedValue([
          customer,
          {...customer, id: "customer_2", isArchived: true},
        ]),
      },
      siteRepository: {
        list: jest.fn().mockResolvedValue([
          site,
          {...site, id: "site_2", archivedAt: new Date()},
        ]),
      },
    });

    const options = await service.getOptions(actorFor("sales"));

    expect(options.customers).toEqual([
      {id: "customer_1", name: "Acme", code: "ACME"},
    ]);
    expect(options.sites).toEqual([{id: "site_1", name: "Atelier", code: "ATL"}]);
    expect(options.items).toEqual([
      {id: "item_croissant", code: "CROISSANT", name: "Croissant", stockUnitId: "unit_piece"},
    ]);
  });

  it("creates an order with the tenant currency", async () => {
    const {service, orderRepository} = dependencies();

    await expect(
      service.createOrder(actorFor("sales"), {
        customerId: "customer_1",
        siteId: "site_1",
        requestedFor: new Date("2026-10-28T00:00:00.000Z"),
        note: null,
      }),
    ).resolves.toEqual({id: "order_1"});
    expect(orderRepository.create).toHaveBeenCalledWith("org_1", {
      customerId: "customer_1",
      siteId: "site_1",
      requestedFor: new Date("2026-10-28T00:00:00.000Z"),
      currency: "EUR",
      note: null,
    });
  });

  it("rejects an unknown customer or site", async () => {
    const missingCustomer = dependencies({
      customerRepository: {find: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missingCustomer.service.createOrder(actorFor("sales"), {
        customerId: "missing",
        siteId: "site_1",
        requestedFor: new Date(),
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const missingSite = dependencies({
      siteRepository: {findById: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missingSite.service.createOrder(actorFor("sales"), {
        customerId: "customer_1",
        siteId: "missing",
        requestedFor: new Date(),
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("adds a line only for a compatible unit", async () => {
    const {service, orderRepository} = dependencies();
    const input = {
      itemId: "item_croissant",
      quantity: "5",
      unitId: "unit_piece",
      unitPrice: "2",
      note: null,
    };

    await expect(
      service.addLine(actorFor("sales"), "order_1", input),
    ).resolves.toBeUndefined();
    expect(orderRepository.addLine).toHaveBeenCalledWith("org_1", "order_1", input);
  });

  it("rejects a line for a missing order, item or incompatible unit", async () => {
    const missingOrder = dependencies({
      orderRepository: {findSummary: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missingOrder.service.addLine(actorFor("sales"), "missing", {
        itemId: "item_croissant",
        quantity: "1",
        unitId: "unit_piece",
        unitPrice: "2",
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const missingItem = dependencies({
      catalogRepository: {listItemOptions: jest.fn().mockResolvedValue([])},
    });
    await expect(
      missingItem.service.addLine(actorFor("sales"), "order_1", {
        itemId: "missing",
        quantity: "1",
        unitId: "unit_piece",
        unitPrice: "2",
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const badUnit = dependencies();
    await expect(
      badUnit.service.addLine(actorFor("sales"), "order_1", {
        itemId: "item_croissant",
        quantity: "1",
        unitId: "unit_kg",
        unitPrice: "2",
        note: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_UNIT"});
  });

  it("confirms only a draft order with lines", async () => {
    const {service, orderRepository} = dependencies();

    await expect(
      service.confirmOrder(actorFor("sales"), "order_1"),
    ).resolves.toBeUndefined();
    expect(orderRepository.confirm).toHaveBeenCalledWith("org_1", "order_1");

    const noLines = dependencies({
      orderRepository: {find: jest.fn().mockResolvedValue({...detail, lines: []})},
    });
    await expect(
      noLines.service.confirmOrder(actorFor("sales"), "order_1"),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});

    const confirmed = dependencies({
      orderRepository: {
        find: jest.fn().mockResolvedValue({...detail, status: "CONFIRMED"}),
      },
    });
    await expect(
      confirmed.service.confirmOrder(actorFor("sales"), "order_1"),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("refuses to confirm a missing order", async () => {
    const {service} = dependencies({
      orderRepository: {find: jest.fn().mockResolvedValue(null)},
    });

    await expect(
      service.confirmOrder(actorFor("sales"), "missing"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("removes a line and cancels an order", async () => {
    const {service, orderRepository} = dependencies();

    await expect(
      service.removeLine(actorFor("sales"), "order_1", "line_1"),
    ).resolves.toBeUndefined();
    await expect(
      service.cancelOrder(actorFor("sales"), "order_1"),
    ).resolves.toBeUndefined();
    expect(orderRepository.removeLine).toHaveBeenCalledWith(
      "org_1",
      "order_1",
      "line_1",
    );
    expect(orderRepository.cancel).toHaveBeenCalledWith("org_1", "order_1");
  });

  it("rejects writes from a read-only role", async () => {
    const {service} = dependencies();

    await expect(
      service.createOrder(actorFor("production_manager"), {
        customerId: "customer_1",
        siteId: "site_1",
        requestedFor: new Date(),
        note: null,
      }),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.cancelOrder(actorFor("production_manager"), "order_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("documents that archived references are accepted", async () => {
    const {service, orderRepository} = dependencies({
      customerRepository: {
        find: jest.fn().mockResolvedValue({...customer, isArchived: true}),
      },
      siteRepository: {
        findById: jest.fn().mockResolvedValue({...site, archivedAt: new Date()}),
      },
    });

    await service.createOrder(actorFor("sales"), {
      customerId: "customer_1",
      siteId: "site_1",
      requestedFor: new Date(),
      note: null,
    });

    // TODO(bug-hunt): the UI filters archived references, the service does not.
    expect(orderRepository.create).toHaveBeenCalled();
  });
});
