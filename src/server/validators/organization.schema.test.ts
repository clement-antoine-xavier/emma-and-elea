import {createOrganizationSchema} from "@/server/validators/organization.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const schema = createOrganizationSchema((key) => key);

function validOrganization(overrides: Record<string, unknown> = {}) {
  return {
    name: "Emma & Éléa",
    slug: "emma-elea",
    siteName: "Atelier",
    siteCode: "atl",
    ...overrides,
  };
}

describe("createOrganizationSchema", () => {
  it("uppercases the site code", () => {
    expect(expectValid(schema, validOrganization()).siteCode).toBe("ATL");
  });

  it("trims the name and slug", () => {
    const parsed = expectValid(
      schema,
      validOrganization({name: "  Bakery  ", slug: "  bakery-1  "}),
    );

    expect(parsed.name).toBe("Bakery");
    expect(parsed.slug).toBe("bakery-1");
  });

  it.each([
    ["bakery-2", true],
    ["a1", true],
    ["a-b-c", true],
    ["a", false],
    ["A1", false],
    ["bakery_2", false],
    ["-bakery", false],
    ["bakery-", false],
    ["bakery--2", false],
    ["x".repeat(61), false],
  ])("slug %p valid=%p", (slug, expected) => {
    const result = schema.safeParse(validOrganization({slug}));
    expect(result.success).toBe(expected);
  });

  it.each([
    [{name: "A"}, "nameRequired"],
    [{name: "x".repeat(81)}, "nameTooLong"],
    [{slug: "A"}, "slugInvalid"],
    [{slug: "x".repeat(61)}, "slugTooLong"],
    [{siteName: "A"}, "siteNameRequired"],
    [{siteName: "x".repeat(81)}, "siteNameTooLong"],
    [{siteCode: "A"}, "siteCodeInvalid"],
    [{siteCode: "ABCDEFGHI"}, "siteCodeInvalid"],
    [{siteCode: "AT-L"}, "siteCodeInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(schema, validOrganization(overrides), message);
  });
});
