import {
  receiptDraftSchema,
  receiptIdSchema,
  receiptLineIdSchema,
  receiptLineSchema,
} from "@/server/validators/purchasing.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const t = (key: string) => key;
const draft = receiptDraftSchema(t);
const line = receiptLineSchema(t);

function validDraft(overrides: Record<string, unknown> = {}) {
  return {
    siteId: "site_1",
    supplierId: "supplier_1",
    supplierReference: "",
    note: "",
    ...overrides,
  };
}

function validLine(overrides: Record<string, unknown> = {}) {
  return {
    itemId: "item_1",
    quantity: "25",
    unitId: "unit_kg",
    unitPrice: "27.50",
    lotNumber: "",
    supplierLotNumber: "",
    expiresOn: "",
    bestBeforeOn: "",
    ...overrides,
  };
}

describe("receiptDraftSchema", () => {
  it("accepts a draft with no reference", () => {
    expectValid(draft, validDraft());
  });

  it.each([
    [{siteId: ""}, "siteRequired"],
    [{supplierId: ""}, "supplierRequired"],
    [{supplierReference: "x".repeat(61)}, "referenceTooLong"],
    [{note: "x".repeat(301)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(draft, validDraft(overrides), message);
  });
});

describe("receiptLineSchema", () => {
  it("accepts a free sample with a zero price", () => {
    expectValid(line, validLine({unitPrice: "0"}));
  });

  it("accepts expiry and best-before dates", () => {
    expectValid(
      line,
      validLine({expiresOn: "2027-01-01", bestBeforeOn: "2026-12-20"}),
    );
  });

  it.each([
    [{itemId: ""}, "itemRequired"],
    [{quantity: "0"}, "quantityInvalid"],
    [{quantity: "-1"}, "quantityInvalid"],
    [{quantity: "1.23456"}, "quantityInvalid"],
    [{unitId: ""}, "unitRequired"],
    [{unitPrice: "-0.01"}, "unitPriceInvalid"],
    [{unitPrice: "abc"}, "unitPriceInvalid"],
    [{lotNumber: "x".repeat(61)}, "lotTooLong"],
    [{supplierLotNumber: "x".repeat(61)}, "lotTooLong"],
    [{expiresOn: "2026-02-30"}, "dateInvalid"],
    [{bestBeforeOn: "soon"}, "dateInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(line, validLine(overrides), message);
  });
});

describe("receipt id schemas", () => {
  it("reject blank ids", () => {
    expectInvalid(receiptIdSchema, {id: ""});
    expectInvalid(receiptLineIdSchema, {receiptId: "", lineId: "line_1"});
    expectInvalid(receiptLineIdSchema, {receiptId: "receipt_1", lineId: ""});
  });
});
