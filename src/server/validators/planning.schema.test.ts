import {
  planIdSchema,
  planInputSchema,
  planLineBatchSchema,
  planLineIdSchema,
  planLineInputSchema,
  planLineUpdateSchema,
} from "@/server/validators/planning.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const t = (key: string) => key;
const plan = planInputSchema(t);
const line = planLineInputSchema(t);
const update = planLineUpdateSchema(t);

function validPlan(overrides: Record<string, unknown> = {}) {
  return {
    siteId: "site_1",
    plannedFor: "2026-10-28",
    includeForecast: true,
    includeOrders: false,
    note: "",
    ...overrides,
  };
}

describe("planInputSchema", () => {
  it("accepts a valid plan", () => {
    expectValid(plan, validPlan());
  });

  it.each([
    [{siteId: ""}, "siteRequired"],
    [{plannedFor: "2026-10-28T00:00"}, "dateInvalid"],
    [{plannedFor: ""}, "dateInvalid"],
    [{note: "x".repeat(301)}, "noteTooLong"],
    [{includeForecast: "true"}, undefined],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(plan, validPlan(overrides), message);
  });
});

describe("planLineInputSchema", () => {
  it("accepts a positive decimal quantity", () => {
    expectValid(line, {itemId: "item_1", quantity: "12.5", note: ""});
  });

  it.each([
    [{itemId: ""}, "itemRequired"],
    [{quantity: "0"}, "quantityInvalid"],
    [{quantity: "-1"}, "quantityInvalid"],
    [{quantity: "abc"}, "quantityInvalid"],
    [{quantity: "1000001"}, "quantityInvalid"],
    [{quantity: "1.23456"}, "quantityInvalid"],
    [{note: "x".repeat(201)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(line, {itemId: "item_1", quantity: "1", note: "", ...overrides}, message);
  });
});

describe("planLineUpdateSchema", () => {
  it("requires a line id and a positive quantity", () => {
    expectValid(update, {lineId: "line_1", quantity: "2"});
    expectInvalid(update, {lineId: "", quantity: "2"}, "lineRequired");
    expectInvalid(update, {lineId: "line_1", quantity: "0"}, "quantityInvalid");
  });
});

describe("plan id schemas", () => {
  it("reject blank ids", () => {
    expectInvalid(planIdSchema, {id: ""});
    expectInvalid(planLineIdSchema, {planId: "", lineId: "line_1"});
    expectInvalid(planLineIdSchema, {planId: "plan_1", lineId: ""});
    expectInvalid(planLineBatchSchema, {lineId: ""});
  });
});
