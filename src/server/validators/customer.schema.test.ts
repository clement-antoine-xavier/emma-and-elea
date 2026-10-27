import {
  customerIdSchema,
  customerInputSchema,
} from "@/server/validators/customer.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const schema = customerInputSchema((key) => key);

function validCustomer(overrides: Record<string, unknown> = {}) {
  return {
    code: "",
    name: "Acme Bakery",
    type: "BUSINESS",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    vatNumber: "",
    note: "",
    ...overrides,
  };
}

describe("customerInputSchema", () => {
  it("accepts a minimal customer with no optional details", () => {
    expect(expectValid(schema, validCustomer()).name).toBe("Acme Bakery");
  });

  it("accepts every optional detail", () => {
    expectValid(
      schema,
      validCustomer({
        code: "AC-1",
        type: "INDIVIDUAL",
        contactName: "Ada",
        email: "ada@example.com",
        phone: "+33 1 23 45 67 89",
        city: "Lyon",
        vatNumber: "FR123456789",
        note: "Collects on Tuesdays",
      }),
    );
  });

  it("trims values before storing them", () => {
    expect(expectValid(schema, validCustomer({name: "  Acme  "})).name).toBe(
      "Acme",
    );
  });

  it.each([
    [{name: "A"}, "nameRequired"],
    [{name: "x".repeat(121)}, "nameTooLong"],
    [{type: "CHARITY"}, "typeInvalid"],
    [{code: "A_B"}, "codeInvalid"],
    [{code: "A".repeat(17)}, "codeInvalid"],
    [{email: "not-an-email"}, "emailInvalid"],
    [{phone: "1".repeat(41)}, "phoneTooLong"],
    [{city: "x".repeat(81)}, "cityTooLong"],
    [{vatNumber: "1".repeat(31)}, "vatTooLong"],
    [{note: "x".repeat(301)}, "noteTooLong"],
    [{contactName: "x".repeat(81)}, "nameTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(schema, validCustomer(overrides), message);
  });

  it("accepts a one-character code", () => {
    expect(expectValid(schema, validCustomer({code: "A"})).code).toBe("A");
  });

  it("rejects a blank id", () => {
    expectInvalid(customerIdSchema, {id: " "});
  });
});
