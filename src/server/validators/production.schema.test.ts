import {
  completeBatchSchema,
  productionBatchIdSchema,
  productionBatchSchema,
  wasteIdSchema,
  wasteSchema,
} from "@/server/validators/production.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const t = (key: string) => key;
const batch = productionBatchSchema(t);
const completion = completeBatchSchema(t);
const waste = wasteSchema(t);

function validBatch(overrides: Record<string, unknown> = {}) {
  return {
    siteId: "site_1",
    recipeVersionId: "version_1",
    plannedQuantity: "10",
    plannedStartAt: "",
    note: "",
    ...overrides,
  };
}

describe("productionBatchSchema", () => {
  it("accepts a plan without a start time", () => {
    expectValid(batch, validBatch());
  });

  it("accepts a calendar-day start date", () => {
    expectValid(batch, validBatch({plannedStartAt: "2026-10-28"}));
  });

  it.each([
    [{siteId: ""}, "siteRequired"],
    [{recipeVersionId: ""}, "recipeRequired"],
    [{plannedQuantity: "0"}, "quantityInvalid"],
    [{plannedQuantity: "-1"}, "quantityInvalid"],
    [{plannedQuantity: "1.23456"}, "quantityInvalid"],
    [{plannedQuantity: "1000001"}, "quantityInvalid"],
    [{plannedStartAt: "tomorrow"}, "dateInvalid"],
    [{plannedStartAt: "2026-10-28T06:30"}, "dateInvalid"],
    [{note: "x".repeat(301)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(batch, validBatch(overrides), message);
  });
});

describe("completeBatchSchema", () => {
  it("accepts a quantity and an optional produced date", () => {
    expectValid(completion, {actualQuantity: "9.5", producedOn: ""});
    expectValid(completion, {
      actualQuantity: "9.5",
      producedOn: "2026-10-28",
    });
  });

  it.each([
    [{actualQuantity: "0"}, "quantityInvalid"],
    [{actualQuantity: "-1"}, "quantityInvalid"],
    [{actualQuantity: "abc"}, "quantityInvalid"],
    [{producedOn: "2026-13-01"}, "dateInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(
      completion,
      {actualQuantity: "1", producedOn: "", ...overrides},
      message,
    );
  });
});

describe("wasteSchema", () => {
  function validWaste(overrides: Record<string, unknown> = {}) {
    return {
      lotId: "lot_1",
      lossReasonId: "reason_1",
      quantity: "2",
      reason: "",
      recordedAt: "",
      ...overrides,
    };
  }

  it("accepts a waste record", () => {
    expectValid(waste, validWaste());
  });

  it.each([
    [{lotId: ""}, "lotRequired"],
    [{lossReasonId: ""}, "reasonRequired"],
    [{quantity: "0"}, "quantityInvalid"],
    [{quantity: "-1"}, "quantityInvalid"],
    [{reason: "x".repeat(301)}, "noteTooLong"],
    [{recordedAt: "bad"}, "dateInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(waste, validWaste(overrides), message);
  });
});

describe("production id schemas", () => {
  it("reject blank ids", () => {
    expectInvalid(productionBatchIdSchema, {id: ""});
    expectInvalid(wasteIdSchema, {id: " "});
  });
});
