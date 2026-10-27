import {
  dailySalesInputSchema,
  dispatchIdSchema,
  dispatchInputSchema,
  dispatchLineIdSchema,
  dispatchLineInputSchema,
  orderIdSchema,
  orderInputSchema,
  orderLineIdSchema,
  orderLineInputSchema,
} from "@/server/validators/sales.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const t = (key: string) => key;
const order = orderInputSchema(t);
const orderLine = orderLineInputSchema(t);
const dispatch = dispatchInputSchema(t);
const dispatchLine = dispatchLineInputSchema(t);
const daily = dailySalesInputSchema(t);

describe("orderInputSchema", () => {
  function validOrder(overrides: Record<string, unknown> = {}) {
    return {
      customerId: "customer_1",
      siteId: "site_1",
      requestedFor: "2026-10-28",
      note: "",
      ...overrides,
    };
  }

  it("accepts an order", () => {
    expectValid(order, validOrder());
  });

  it.each([
    [{customerId: ""}, "customerRequired"],
    [{siteId: ""}, "siteRequired"],
    [{requestedFor: "2026-10-28T08:00"}, "dateInvalid"],
    [{note: "x".repeat(301)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(order, validOrder(overrides), message);
  });
});

describe("orderLineInputSchema", () => {
  function validLine(overrides: Record<string, unknown> = {}) {
    return {
      itemId: "item_1",
      quantity: "2",
      unitId: "unit_piece",
      unitPrice: "3.50",
      note: "",
      ...overrides,
    };
  }

  it("accepts a zero unit price", () => {
    expectValid(orderLine, validLine({unitPrice: "0"}));
  });

  it.each([
    [{itemId: ""}, "itemRequired"],
    [{quantity: "0"}, "quantityInvalid"],
    [{quantity: "-1"}, "quantityInvalid"],
    [{unitId: ""}, "unitRequired"],
    [{unitPrice: "-1"}, "priceInvalid"],
    [{unitPrice: "1.23456"}, "priceInvalid"],
    [{note: "x".repeat(201)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(orderLine, validLine(overrides), message);
  });
});

describe("dispatchInputSchema", () => {
  function validDispatch(overrides: Record<string, unknown> = {}) {
    return {
      siteId: "site_1",
      customerId: "",
      orderId: "",
      carrier: "",
      note: "",
      ...overrides,
    };
  }

  it("accepts an internal transfer without a customer or order", () => {
    expectValid(dispatch, validDispatch());
  });

  it("accepts an order-linked dispatch", () => {
    expectValid(
      dispatch,
      validDispatch({orderId: "order_1", carrier: "Van", customerId: "c_1"}),
    );
  });

  it.each([
    [{siteId: ""}, "siteRequired"],
    [{carrier: "x".repeat(81)}, "noteTooLong"],
    [{note: "x".repeat(301)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(dispatch, validDispatch(overrides), message);
  });
});

describe("dispatchLineInputSchema", () => {
  function validLine(overrides: Record<string, unknown> = {}) {
    return {
      lotId: "lot_1",
      quantity: "1",
      unitPrice: "",
      note: "",
      ...overrides,
    };
  }

  it("accepts an empty or numeric price", () => {
    expectValid(dispatchLine, validLine());
    expectValid(dispatchLine, validLine({unitPrice: "0"}));
    expectValid(dispatchLine, validLine({unitPrice: "2.5"}));
  });

  it.each([
    [{lotId: ""}, "lotRequired"],
    [{quantity: "0"}, "quantityInvalid"],
    [{quantity: "-1"}, "quantityInvalid"],
    [{unitPrice: "-1"}, "priceInvalid"],
    [{unitPrice: "abc"}, "priceInvalid"],
    [{note: "x".repeat(201)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(dispatchLine, validLine(overrides), message);
  });
});

describe("dailySalesInputSchema", () => {
  function validDaily(overrides: Record<string, unknown> = {}) {
    return {
      siteId: "site_1",
      itemId: "item_1",
      businessDate: "2026-10-27",
      channel: "RETAIL",
      quantitySold: "12",
      revenue: "36.50",
      note: "",
      ...overrides,
    };
  }

  it("accepts zero revenue", () => {
    expectValid(daily, validDaily({revenue: "0"}));
  });

  it.each([
    [{siteId: ""}, "siteRequired"],
    [{itemId: ""}, "itemRequired"],
    [{businessDate: "today"}, "dateInvalid"],
    [{channel: "ONLINE"}, "channelInvalid"],
    [{quantitySold: "0"}, "quantityInvalid"],
    [{quantitySold: "-1"}, "quantityInvalid"],
    [{revenue: "-1"}, "revenueInvalid"],
    [{revenue: "10000000.01"}, "revenueInvalid"],
    [{note: "x".repeat(301)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(daily, validDaily(overrides), message);
  });
});

describe("sales id schemas", () => {
  it("reject blank ids", () => {
    expectInvalid(orderIdSchema, {id: ""});
    expectInvalid(dispatchIdSchema, {id: " "});
    expectInvalid(orderLineIdSchema, {orderId: "", lineId: "line_1"});
    expectInvalid(dispatchLineIdSchema, {dispatchId: "d_1", lineId: ""});
  });
});
