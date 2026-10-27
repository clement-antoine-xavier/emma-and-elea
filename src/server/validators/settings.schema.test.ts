import {updateOrganizationSettingsSchema} from "@/server/validators/settings.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const schema = updateOrganizationSettingsSchema((key) => key);

function validSettings(overrides: Record<string, unknown> = {}) {
  return {
    currency: "EUR",
    overheadPct: "10",
    forecastHistoryDays: "56",
    forecastSafetyPct: "5",
    defaultShelfLifeDays: "",
    lotNumberPattern: "{site}-{yyMMdd}-{seq}",
    pricesIncludeVat: "true",
    ...overrides,
  };
}

describe("updateOrganizationSettingsSchema", () => {
  it("accepts the defaults", () => {
    expectValid(schema, validSettings());
  });

  it("accepts lowercase currency and a zero shelf life", () => {
    expect(
      expectValid(
        schema,
        validSettings({currency: "eur", defaultShelfLifeDays: "0"}),
      ).currency,
    ).toBe("eur");
  });

  it.each([
    [{currency: "EU"}, "currencyInvalid"],
    [{currency: "EURO"}, "currencyInvalid"],
    [{currency: "€UR"}, "currencyInvalid"],
    [{overheadPct: "-1"}, "overheadInvalid"],
    [{overheadPct: "100.01"}, "overheadInvalid"],
    [{overheadPct: "1.234"}, "overheadInvalid"],
    [{forecastHistoryDays: "6"}, "historyInvalid"],
    [{forecastHistoryDays: "366"}, "historyInvalid"],
    [{forecastHistoryDays: "56.5"}, "historyInvalid"],
    [{forecastSafetyPct: "-1"}, "safetyInvalid"],
    [{forecastSafetyPct: "100.01"}, "safetyInvalid"],
    [{defaultShelfLifeDays: "366"}, "shelfLifeInvalid"],
    [{defaultShelfLifeDays: "-1"}, "shelfLifeInvalid"],
    [{lotNumberPattern: "ab"}, "lotPatternInvalid"],
    [{lotNumberPattern: "x".repeat(61)}, "lotPatternInvalid"],
    [{pricesIncludeVat: "yes"}, "vatInvalid"],
    [{pricesIncludeVat: true}, "vatInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(schema, validSettings(overrides), message);
  });

  it("accepts the minimum history window", () => {
    expectValid(schema, validSettings({forecastHistoryDays: "7"}));
  });
});
