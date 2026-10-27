import {
  supplierIdSchema,
  supplierInputSchema,
  supplierItemIdSchema,
  supplierItemInputSchema,
} from "@/server/validators/supplier.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const t = (key: string) => key;
const supplier = supplierInputSchema(t);
const supplierItem = supplierItemInputSchema(t);

function validSupplier(overrides: Record<string, unknown> = {}) {
  return {
    code: "SUP-1",
    name: "Mill",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    defaultLeadTimeDays: "",
    note: "",
    ...overrides,
  };
}

function validSupplierItem(overrides: Record<string, unknown> = {}) {
  return {
    itemId: "item_flour",
    supplierRef: "",
    packQuantity: "25",
    packUnitId: "unit_kg",
    price: "27.50",
    leadTimeDays: "",
    minOrderQuantity: "",
    isPreferred: false,
    validFrom: "2026-01-01",
    ...overrides,
  };
}

describe("supplierInputSchema", () => {
  it("accepts a minimal supplier", () => {
    expectValid(supplier, validSupplier());
  });

  it("accepts contact details and a lead time", () => {
    expectValid(
      supplier,
      validSupplier({
        contactName: "Ada",
        email: "ada@example.com",
        phone: "0123456789",
        city: "Lyon",
        defaultLeadTimeDays: "0",
        note: "Delivers Tuesday",
      }),
    );
  });

  it.each([
    [{code: "A"}, "codeInvalid"],
    [{code: "A_B"}, "codeInvalid"],
    [{code: "A".repeat(17)}, "codeInvalid"],
    [{name: "A"}, "nameRequired"],
    [{name: "x".repeat(121)}, "nameTooLong"],
    [{email: "not-an-email"}, "emailInvalid"],
    [{phone: "1".repeat(41)}, "phoneTooLong"],
    [{city: "x".repeat(81)}, "cityTooLong"],
    [{defaultLeadTimeDays: "366"}, "leadTimeInvalid"],
    [{defaultLeadTimeDays: "1.5"}, "leadTimeInvalid"],
    [{note: "x".repeat(301)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(supplier, validSupplier(overrides), message);
  });
});

describe("supplierItemInputSchema", () => {
  it("accepts a pack price", () => {
    expectValid(supplierItem, validSupplierItem());
  });

  it("accepts a tiny pack and zero price", () => {
    expectValid(
      supplierItem,
      validSupplierItem({
        packQuantity: "0.0001",
        price: "0",
        minOrderQuantity: "0",
        isPreferred: true,
        leadTimeDays: "365",
      }),
    );
  });

  it.each([
    [{itemId: ""}, "itemRequired"],
    [{packQuantity: "0"}, "packQuantityInvalid"],
    [{packQuantity: "0.00001"}, "packQuantityInvalid"],
    [{packUnitId: ""}, "itemRequired"],
    [{price: "-1"}, "priceInvalid"],
    [{price: "1.23456"}, "priceInvalid"],
    [{leadTimeDays: "366"}, "leadTimeInvalid"],
    [{minOrderQuantity: "-1"}, "minOrderInvalid"],
    [{validFrom: ""}, "dateInvalid"],
    [{supplierRef: "x".repeat(61)}, "refTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(supplierItem, validSupplierItem(overrides), message);
  });
});

describe("supplier id schemas", () => {
  it("reject blank ids", () => {
    expectInvalid(supplierIdSchema, {id: ""});
    expectInvalid(supplierItemIdSchema, {id: " "});
  });
});
