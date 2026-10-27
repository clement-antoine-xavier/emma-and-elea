import {
  formatBusinessDate,
  formatMoney,
  formatPercent,
  formatQuantity,
} from "./format";

describe("format", () => {
  it("formats money with the active locale and currency", () => {
    expect(
      formatMoney("12.5", {locale: "en-GB", currency: "EUR"}),
    ).toBe("€12.50");
  });

  it("keeps four-decimal unit costs readable", () => {
    expect(
      formatMoney("0.0187", {
        locale: "en-GB",
        currency: "EUR",
        minimumFractionDigits: 3,
        maximumFractionDigits: 4,
      }),
    ).toBe("€0.0187");
  });

  it("shows a fallback instead of NaN for missing values", () => {
    expect(
      formatMoney(undefined, {locale: "en-GB", currency: "EUR"}),
    ).toBe("—");
    expect(
      formatQuantity("not-a-number", {locale: "en-GB", fallback: "n/a"}),
    ).toBe("n/a");
  });

  it("formats quantities and percentages", () => {
    expect(
      formatQuantity("1234.5678", {locale: "en-GB"}),
    ).toBe("1,234.568");
    expect(formatPercent("42.126", {locale: "en-GB"})).toBe("42.1%");
  });

  it("renders business dates without a timezone shift", () => {
    expect(
      formatBusinessDate("2026-10-27T00:00:00.000Z", {
        locale: "en-GB",
        dateStyle: "short",
      }),
    ).toBe("27/10/2026");
  });
});
