import {getActorContext} from "@/server/auth/actor";
import {
  dailySalesService,
  dispatchService,
  orderService,
} from "@/server/services/container";
import {
  addDispatchLineAction,
  addOrderLineAction,
  cancelDispatchAction,
  cancelOrderAction,
  confirmOrderAction,
  createDispatchAction,
  createOrderAction,
  postDispatchAction,
  recordDailySalesAction,
  removeDispatchLineAction,
  removeOrderLineAction,
} from "@/app/actions/sales.actions";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";

jest.mock("@/server/auth/actor", () => ({getActorContext: jest.fn()}));
jest.mock("@/server/services/container", () => ({
  orderService: {
    createOrder: jest.fn(),
    addLine: jest.fn(),
    removeLine: jest.fn(),
    confirmOrder: jest.fn(),
    cancelOrder: jest.fn(),
  },
  dispatchService: {
    createDispatch: jest.fn(),
    addLine: jest.fn(),
    removeLine: jest.fn(),
    postDispatch: jest.fn(),
    cancelDispatch: jest.fn(),
  },
  dailySalesService: {recordDailySales: jest.fn()},
}));

const getActor = getActorContext as jest.Mock;
const order = orderService as unknown as Record<string, jest.Mock>;
const dispatch = dispatchService as unknown as Record<string, jest.Mock>;
const daily = dailySalesService as unknown as Record<string, jest.Mock>;

const orderInput = {
  customerId: "customer_1",
  siteId: "site_1",
  requestedFor: "2026-10-28",
  note: "",
};

beforeEach(() => {
  jest.clearAllMocks();
  getActor.mockResolvedValue(actorFor("sales"));
});

describe("order actions", () => {
  it("rejects a visitor", async () => {
    getActor.mockResolvedValue(null);

    await expect(createOrderAction(orderInput)).resolves.toEqual({
      ok: false,
      error: "unauthenticated",
    });
  });

  it("converts the requested day to UTC midnight", async () => {
    order.createOrder.mockResolvedValue({id: "order_1"});

    await expect(createOrderAction(orderInput)).resolves.toEqual({
      ok: true,
      orderId: "order_1",
    });
    expect(order.createOrder).toHaveBeenCalledWith(expect.any(Object), {
      customerId: "customer_1",
      siteId: "site_1",
      requestedFor: new Date("2026-10-28T00:00:00.000Z"),
      note: null,
    });
  });

  it("rejects invalid input and validates the order id on lines", async () => {
    await expect(
      createOrderAction({...orderInput, requestedFor: "tomorrow"}),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
    await expect(
      addOrderLineAction("", {
        itemId: "item_1",
        quantity: "1",
        unitId: "unit_piece",
        unitPrice: "2",
        note: "",
      }),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
    expect(order.addLine).not.toHaveBeenCalled();
  });

  it("adds and removes a line", async () => {
    order.addLine.mockResolvedValue(undefined);
    order.removeLine.mockResolvedValue(undefined);

    await expect(
      addOrderLineAction("order_1", {
        itemId: "item_1",
        quantity: "1.5",
        unitId: "unit_piece",
        unitPrice: "2.5",
        note: "  ",
      }),
    ).resolves.toEqual({ok: true});
    expect(order.addLine).toHaveBeenCalledWith(
      expect.any(Object),
      "order_1",
      {
        itemId: "item_1",
        quantity: "1.5",
        unitId: "unit_piece",
        unitPrice: "2.5",
        note: null,
      },
    );

    await expect(
      removeOrderLineAction({orderId: "order_1", lineId: "line_1"}),
    ).resolves.toEqual({ok: true});
  });

  it("confirms and cancels an order, mapping state errors", async () => {
    order.confirmOrder.mockResolvedValue(undefined);
    order.cancelOrder.mockResolvedValue(undefined);

    await expect(confirmOrderAction({id: "order_1"})).resolves.toEqual({
      ok: true,
    });
    await expect(cancelOrderAction({id: "order_1"})).resolves.toEqual({
      ok: true,
    });

    order.confirmOrder.mockRejectedValue(
      new DomainError("INVALID_STATE_TRANSITION"),
    );
    await expect(confirmOrderAction({id: "order_1"})).resolves.toEqual({
      ok: false,
      error: "invalidState",
    });
  });

  it("rejects a blank order id", async () => {
    await expect(confirmOrderAction({id: ""})).resolves.toEqual({
      ok: false,
      error: "invalidInput",
    });
  });
});

describe("dispatch actions", () => {
  it("creates a dispatch", async () => {
    dispatch.createDispatch.mockResolvedValue({id: "dispatch_1"});

    await expect(
      createDispatchAction({
        siteId: "site_1",
        customerId: "",
        orderId: "",
        carrier: "Van",
        note: "",
      }),
    ).resolves.toEqual({ok: true, dispatchId: "dispatch_1"});
  });

  it("adds a line with an empty price as null", async () => {
    dispatch.addLine.mockResolvedValue(undefined);

    await expect(
      addDispatchLineAction("dispatch_1", {
        lotId: "lot_1",
        quantity: "1",
        unitPrice: "",
        note: "",
      }),
    ).resolves.toEqual({ok: true});
    expect(dispatch.addLine).toHaveBeenCalledWith(
      expect.any(Object),
      "dispatch_1",
      {lotId: "lot_1", quantity: "1", unitPrice: null, note: null},
    );
  });

  it("posts, cancels and removes a line", async () => {
    dispatch.postDispatch.mockResolvedValue(undefined);
    dispatch.cancelDispatch.mockResolvedValue(undefined);
    dispatch.removeLine.mockResolvedValue(undefined);

    await expect(postDispatchAction({id: "dispatch_1"})).resolves.toEqual({
      ok: true,
    });
    await expect(cancelDispatchAction({id: "dispatch_1"})).resolves.toEqual({
      ok: true,
    });
    await expect(
      removeDispatchLineAction({
        dispatchId: "dispatch_1",
        lineId: "line_1",
      }),
    ).resolves.toEqual({ok: true});
  });

  it("maps insufficient stock", async () => {
    dispatch.postDispatch.mockRejectedValue(
      new DomainError("INSUFFICIENT_STOCK"),
    );

    await expect(postDispatchAction({id: "dispatch_1"})).resolves.toEqual({
      ok: false,
      error: "generic",
    });
  });
});

describe("daily sales action", () => {
  const input = {
    siteId: "site_1",
    itemId: "item_1",
    businessDate: "2026-10-27",
    channel: "RETAIL",
    quantitySold: "10",
    revenue: "30",
    note: "",
  };

  it("records a day with the parsed date", async () => {
    daily.recordDailySales.mockResolvedValue(undefined);

    await expect(recordDailySalesAction(input)).resolves.toEqual({ok: true});
    expect(daily.recordDailySales).toHaveBeenCalledWith(expect.any(Object), {
      siteId: "site_1",
      itemId: "item_1",
      businessDate: new Date("2026-10-27T00:00:00.000Z"),
      channel: "RETAIL",
      quantitySold: "10",
      revenue: "30",
      note: null,
    });
  });

  it("rejects a zero quantity and a negative revenue", async () => {
    await expect(
      recordDailySalesAction({...input, quantitySold: "0"}),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
    await expect(
      recordDailySalesAction({...input, revenue: "-1"}),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
  });

  it("maps a missing reference", async () => {
    daily.recordDailySales.mockRejectedValue(new DomainError("NOT_FOUND"));

    await expect(recordDailySalesAction(input)).resolves.toEqual({
      ok: false,
      error: "notFound",
    });
  });
});
