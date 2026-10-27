import {
  formatBusinessDate,
  formatDateTime,
  formatMinutes,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatZonedDate,
  formatZonedTime,
} from "./format";

describe("format money and quantities", () => {
  it("accepts numbers as well as strings", () => {
    expect(formatMoney(12.5, {locale: "en-GB", currency: "EUR"})).toBe(
      "€12.50",
    );
    expect(formatQuantity(12.5, {locale: "en-GB"})).toBe("12.5");
  });

  it("formats negative money", () => {
    expect(formatMoney("-2.5", {locale: "en-GB", currency: "EUR"})).toBe(
      "-€2.50",
    );
  });

  it("applies the requested fraction digits", () => {
    expect(
      formatQuantity("1.2", {
        locale: "en-GB",
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }),
    ).toBe("1.20");
  });

  it("uses the locale decimal separator", () => {
    expect(formatPercent("42.126", {locale: "fr-FR"})).toContain("42,1");
    expect(formatQuantity("1234.5", {locale: "fr-FR"})).toBe(
      "1\u202f234,5",
    );
  });

  it("formats an explicit fallback for empty and invalid values", () => {
    const options = {
      locale: "en-GB",
      currency: "EUR",
      fallback: "not set",
    };

    expect(formatMoney("", options)).toBe("not set");
    expect(formatMoney("abc", options)).toBe("not set");
    expect(formatQuantity(null, {locale: "en-GB", fallback: "n/a"})).toBe(
      "n/a",
    );
    expect(formatPercent(undefined, {locale: "en-GB"})).toBe("—");
  });
});

describe("format dates", () => {
  it("renders a business date from a UTC timestamp", () => {
    expect(
      formatBusinessDate("2026-10-27T00:00:00.000Z", {locale: "fr-FR"}),
    ).toBe("27 oct. 2026");
  });

  it("accepts Date objects and honours the date style", () => {
    expect(
      formatBusinessDate(new Date("2026-10-27T00:00:00.000Z"), {
        locale: "en-GB",
        dateStyle: "long",
      }),
    ).toBe("27 October 2026");
  });

  it("falls back for missing or invalid dates", () => {
    expect(formatBusinessDate(null, {locale: "en-GB"})).toBe("—");
    expect(
      formatBusinessDate("not-a-date", {
        locale: "en-GB",
        fallback: "unknown",
      }),
    ).toBe("unknown");
  });

  it("renders an instant in the site timezone", () => {
    const instant = "2026-10-27T23:30:00.000Z";

    expect(
      formatDateTime(instant, {locale: "en-GB", timeZone: "Europe/Paris"}),
    ).toBe("28 Oct 2026, 00:30");
    expect(
      formatZonedDate(instant, {locale: "en-GB", timeZone: "Europe/Paris"}),
    ).toBe("28 Oct 2026");
    expect(
      formatZonedTime(instant, {locale: "en-GB", timeZone: "Europe/Paris"}),
    ).toBe("00:30");
  });

  it("keeps the same day in UTC when the site timezone is UTC", () => {
    expect(
      formatZonedDate("2026-10-27T23:30:00.000Z", {
        locale: "en-GB",
        timeZone: "UTC",
      }),
    ).toBe("27 Oct 2026");
  });

  it("uses fallbacks for invalid zoned dates", () => {
    expect(
      formatDateTime("bad", {
        locale: "en-GB",
        timeZone: "UTC",
        fallback: "?",
      }),
    ).toBe("?");
    expect(
      formatZonedTime("", {locale: "en-GB", timeZone: "UTC"}),
    ).toBe("—");
  });
});

describe("formatMinutes", () => {
  it.each([
    [0, "00:00"],
    [5, "00:05"],
    [60, "01:00"],
    [90, "01:30"],
    [1439, "23:59"],
  ])("renders %i as %s", (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });
});
