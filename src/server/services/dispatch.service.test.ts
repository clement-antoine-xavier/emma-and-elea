import {createDispatchService} from "@/server/services/dispatch.service";
import type {DispatchRepository} from "@/server/repositories/dispatch.repository";
import type {CustomerRepository} from "@/server/repositories/customer.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {OrderRepository} from "@/server/repositories/order.repository";
import type {DispatchDetailRecord, DispatchSummaryRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";

const summary: DispatchSummaryRecord = {
  id: "dispatch_1",
  number: "SD-1",
  customerName: "Acme",
  siteName: "Atelier",
  orderNumber: "SO-1",
  status: "DRAFT",
  dispatchedAt: null,
  lineCount: 1,
  createdAt: new Date("2026-10-27T10:00:00.000Z"),
};

const detail: DispatchDetailRecord = {
  ...summary,
  customerId: "customer_1",
  siteId: "site_1",
  orderId: "order_1",
  carrier: "Van",
  note: null,
  lines: [
    {
      id: "line_1",
      itemId: "item_1",
      itemCode: "CROISSANT",
      itemName: "Croissant",
      lotId: "lot_1",
      lotNumber: "ATL-1",
      quantity: "2",
      unitCode: "piece",
      unitPrice: "2",
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

const lot = {
  id: "lot_1",
  siteId: "site_1",
  itemId: "item_1",
  itemName: "Croissant",
  unitId: "unit_piece",
  unitCode: "piece",
  quantityRemaining: "10",
};

function dependencies(overrides: {
  dispatchRepository?: Partial<DispatchRepository>;
  customerRepository?: Partial<CustomerRepository>;
  siteRepository?: Partial<SiteRepository>;
  orderRepository?: Partial<OrderRepository>;
} = {}) {
  const dispatchRepository = {
    list: jest.fn().mockResolvedValue({dispatches: [summary], total: 1}),
    find: jest.fn().mockResolvedValue(detail),
    create: jest.fn().mockResolvedValue("dispatch_1"),
    addLine: jest.fn().mockResolvedValue(undefined),
    removeLine: jest.fn().mockResolvedValue(undefined),
    post: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    findLot: jest.fn().mockResolvedValue(lot),
    options: jest.fn().mockResolvedValue({
      customers: [{id: "customer_1", name: "Acme", code: "ACME"}],
      sites: [{id: "site_1", name: "Atelier", code: "ATL"}],
      orders: [{id: "order_1", number: "SO-1", customerName: "Acme"}],
      lots: [{...lot, lotNumber: "ATL-1"}],
    }),
    ...overrides.dispatchRepository,
  } as unknown as DispatchRepository;
  const customerRepository = {
    find: jest.fn().mockResolvedValue(customer),
    ...overrides.customerRepository,
  } as unknown as CustomerRepository;
  const siteRepository = {
    findById: jest.fn().mockResolvedValue(site),
    ...overrides.siteRepository,
  } as unknown as SiteRepository;
  const orderRepository = {
    findSummary: jest.fn().mockResolvedValue({
      id: "order_1",
      status: "CONFIRMED",
      customerId: "customer_1",
    }),
    ...overrides.orderRepository,
  } as unknown as OrderRepository;

  return {
    dispatchRepository,
    customerRepository,
    siteRepository,
    orderRepository,
    service: createDispatchService({
      dispatchRepository,
      customerRepository,
      siteRepository,
      orderRepository,
    }),
  };
}

describe("dispatch service", () => {
  it("requires a member with dispatch:read", async () => {
    const {service} = dependencies();

    await expect(service.getDispatches(null, {})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      service.getDispatches(actorFor("staff"), {}),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("lists dispatches with filters and pagination", async () => {
    const {service, dispatchRepository} = dependencies();

    const result = await service.getDispatches(actorFor("sales"), {
      search: " acme ",
      status: "DRAFT",
      page: "3",
      pageSize: "10",
    });

    expect(dispatchRepository.list).toHaveBeenCalledWith("org_1", {
      search: "acme",
      status: "DRAFT",
      skip: 20,
      take: 10,
    });
    expect(result).toEqual({
      page: {items: [summary], total: 1, page: 3, pageSize: 10},
      canWrite: true,
      filters: {search: "acme", status: "DRAFT"},
    });
  });

  it("drops an unknown status", async () => {
    const {service, dispatchRepository} = dependencies();

    const result = await service.getDispatches(actorFor("sales"), {
      status: "SHIPPED",
    });

    expect(dispatchRepository.list).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({status: null}),
    );
    expect(result.filters.status).toBeNull();
  });

  it("returns a dispatch or null with the write flag", async () => {
    const {service} = dependencies();

    await expect(
      service.getDispatch(actorFor("sales"), "dispatch_1"),
    ).resolves.toEqual({dispatch: detail, canWrite: true});
    await expect(
      service.getDispatch(actorFor("production_manager"), "dispatch_1"),
    ).resolves.toMatchObject({canWrite: false});

    const empty = dependencies({
      dispatchRepository: {find: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      empty.service.getDispatch(actorFor("sales"), "missing"),
    ).resolves.toBeNull();
  });

  it("returns repository options", async () => {
    const {service} = dependencies();

    await expect(
      service.getOptions(actorFor("sales")),
    ).resolves.toMatchObject({
      customers: [{id: "customer_1", name: "Acme", code: "ACME"}],
      orders: [{id: "order_1", number: "SO-1", customerName: "Acme"}],
    });
  });

  it("creates a standalone dispatch without a customer", async () => {
    const {service, dispatchRepository} = dependencies();

    await expect(
      service.createDispatch(actorFor("sales"), {
        siteId: "site_1",
        customerId: null,
        orderId: null,
        carrier: null,
        note: null,
      }),
    ).resolves.toEqual({id: "dispatch_1"});
    expect(dispatchRepository.create).toHaveBeenCalledWith("org_1", {
      siteId: "site_1",
      customerId: null,
      orderId: null,
      carrier: null,
      note: null,
    });
  });

  it("takes the customer from a confirmed order", async () => {
    const {service, dispatchRepository} = dependencies();

    await service.createDispatch(actorFor("sales"), {
      siteId: "site_1",
      customerId: null,
      orderId: "order_1",
      carrier: null,
      note: null,
    });

    expect(dispatchRepository.create).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({customerId: "customer_1", orderId: "order_1"}),
    );
  });

  it("rejects a missing site, order or customer", async () => {
    const missingSite = dependencies({
      siteRepository: {findById: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missingSite.service.createDispatch(actorFor("sales"), {
        siteId: "missing",
        customerId: null,
        orderId: null,
        carrier: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const missingOrder = dependencies({
      orderRepository: {findSummary: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missingOrder.service.createDispatch(actorFor("sales"), {
        siteId: "site_1",
        customerId: null,
        orderId: "missing",
        carrier: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const missingCustomer = dependencies({
      customerRepository: {find: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missingCustomer.service.createDispatch(actorFor("sales"), {
        siteId: "site_1",
        customerId: "missing",
        orderId: null,
        carrier: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("refuses a draft or cancelled order and a mismatched customer", async () => {
    const draftOrder = dependencies({
      orderRepository: {
        findSummary: jest.fn().mockResolvedValue({
          id: "order_1",
          status: "DRAFT",
          customerId: "customer_1",
        }),
      },
    });
    await expect(
      draftOrder.service.createDispatch(actorFor("sales"), {
        siteId: "site_1",
        customerId: null,
        orderId: "order_1",
        carrier: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});

    const mismatch = dependencies();
    await expect(
      mismatch.service.createDispatch(actorFor("sales"), {
        siteId: "site_1",
        customerId: "customer_other",
        orderId: "order_1",
        carrier: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("adds a lot line from the dispatch site", async () => {
    const {service, dispatchRepository} = dependencies();

    await expect(
      service.addLine(actorFor("sales"), "dispatch_1", {
        lotId: "lot_1",
        quantity: "2",
        unitPrice: "2",
        note: null,
      }),
    ).resolves.toBeUndefined();
    expect(dispatchRepository.addLine).toHaveBeenCalledWith(
      "org_1",
      "dispatch_1",
      {
        lotId: "lot_1",
        itemId: "item_1",
        unitId: "unit_piece",
        quantity: "2",
        unitPrice: "2",
        note: null,
      },
    );
  });

  it("rejects a missing dispatch or lot", async () => {
    const missingDispatch = dependencies({
      dispatchRepository: {find: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missingDispatch.service.addLine(actorFor("sales"), "missing", {
        lotId: "lot_1",
        quantity: "1",
        unitPrice: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const missingLot = dependencies({
      dispatchRepository: {findLot: jest.fn().mockResolvedValue(null)},
    });
    await expect(
      missingLot.service.addLine(actorFor("sales"), "dispatch_1", {
        lotId: "missing",
        quantity: "1",
        unitPrice: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("rejects a lot from another site and an over-quantity", async () => {
    const otherSite = dependencies({
      dispatchRepository: {
        findLot: jest.fn().mockResolvedValue({...lot, siteId: "site_2"}),
      },
    });
    await expect(
      otherSite.service.addLine(actorFor("sales"), "dispatch_1", {
        lotId: "lot_1",
        quantity: "1",
        unitPrice: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});

    const tooMuch = dependencies();
    await expect(
      tooMuch.service.addLine(actorFor("sales"), "dispatch_1", {
        lotId: "lot_1",
        quantity: "11",
        unitPrice: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "INSUFFICIENT_STOCK"});
  });

  it("removes, posts and cancels", async () => {
    const {service, dispatchRepository} = dependencies();

    await expect(
      service.removeLine(actorFor("sales"), "dispatch_1", "line_1"),
    ).resolves.toBeUndefined();
    await expect(
      service.postDispatch(actorFor("sales"), "dispatch_1"),
    ).resolves.toBeUndefined();
    await expect(
      service.cancelDispatch(actorFor("sales"), "dispatch_1"),
    ).resolves.toBeUndefined();
    expect(dispatchRepository.post).toHaveBeenCalledWith("org_1", "dispatch_1");
    expect(dispatchRepository.cancel).toHaveBeenCalledWith(
      "org_1",
      "dispatch_1",
    );
  });

  it("rejects writes from a read-only role", async () => {
    const {service} = dependencies();

    await expect(
      service.createDispatch(actorFor("production_manager"), {
        siteId: "site_1",
        customerId: null,
        orderId: null,
        carrier: null,
        note: null,
      }),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.postDispatch(actorFor("production_manager"), "dispatch_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});
