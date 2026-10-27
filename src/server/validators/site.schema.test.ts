import {
  createSiteSchema,
  siteIdSchema,
  updateSiteSchema,
} from "@/server/validators/site.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const t = (key: string) => key;
const create = createSiteSchema(t);
const update = updateSiteSchema(t);

function validSite(overrides: Record<string, unknown> = {}) {
  return {
    name: "Atelier",
    code: "ATL",
    kind: "WORKSHOP",
    city: "Lyon",
    timezone: "Europe/Paris",
    ...overrides,
  };
}

describe("createSiteSchema", () => {
  it("accepts every site kind", () => {
    for (const kind of ["WORKSHOP", "SHOP", "WAREHOUSE", "LAB"]) {
      expectValid(create, validSite({kind}));
    }
  });

  it("accepts UTC and an IANA zone", () => {
    expectValid(create, validSite({timezone: "UTC"}));
    expectValid(create, validSite({timezone: "America/New_York"}));
  });

  it.each([
    [{name: "A"}, "nameRequired"],
    [{name: "x".repeat(81)}, "nameTooLong"],
    [{code: "A"}, "codeInvalid"],
    [{code: "ABCDEFGHI"}, "codeInvalid"],
    [{code: "AT-L"}, "codeInvalid"],
    [{kind: "OFFICE"}, "kindInvalid"],
    [{city: "x".repeat(81)}, "cityTooLong"],
    [{timezone: ""}, "timezoneInvalid"],
    [{timezone: "Mars/Base"}, "timezoneInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(create, validSite(overrides), message);
  });
});

describe("updateSiteSchema", () => {
  it("extends the create schema with an id", () => {
    expectValid(update, {...validSite(), id: "site_1"});
    expectInvalid(update, validSite());
  });

  it("rejects a blank id", () => {
    expectInvalid(siteIdSchema, {id: " "});
  });
});
