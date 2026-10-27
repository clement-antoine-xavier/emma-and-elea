import {
  decimalString,
  isDecimalText,
  isoDateString,
  isoDateTimeString,
  optionalDecimalString,
  optionalIsoDateString,
} from "@/server/validators/shared";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const required = decimalString({message: "amount"});
const optional = optionalDecimalString({message: "amount"});
const date = isoDateString("date");
const optionalDate = optionalIsoDateString("date");
const dateTime = isoDateTimeString("date");

describe("isDecimalText", () => {
  it.each(["0", "1", "1.5", "001.50", "999999"])("accepts %s", (value) => {
    expect(isDecimalText(value)).toBe(true);
  });

  it.each([
    "",
    ".5",
    "1.",
    "-1",
    "+1",
    "1e3",
    "1,5",
    " 1",
    "1 ",
    "1.23456",
  ])("rejects %p", (value) => {
    expect(isDecimalText(value)).toBe(false);
  });

  it("enforces the configured scale and bounds", () => {
    expect(isDecimalText("1.2345", {scale: 4})).toBe(true);
    expect(isDecimalText("1.23456", {scale: 4})).toBe(false);
    expect(isDecimalText("0.0001", {min: 0.0001, scale: 4})).toBe(true);
    expect(isDecimalText("0.00001", {min: 0.0001, scale: 4})).toBe(false);
    expect(isDecimalText("100", {max: 100})).toBe(true);
    expect(isDecimalText("100.01", {max: 100})).toBe(false);
    expect(isDecimalText("9007199254740992")).toBe(false);
  });
});

describe("decimalString", () => {
  it("trims before validating", () => {
    expect(expectValid(required, "  2.50  ")).toBe("2.50");
  });

  it("reports the supplied message", () => {
    expectInvalid(required, "", "amount");
    expectInvalid(required, "abc", "amount");
  });

  it("accepts an empty value only when optional", () => {
    expectInvalid(required, "", "amount");
    expect(expectValid(optional, "")).toBe("");
    expect(expectValid(optional, "0")).toBe("0");
  });
});

describe("isoDateString", () => {
  it.each(["2024-01-01", "2024-02-29", "2026-12-31"])(
    "accepts %s",
    (value) => {
      expect(expectValid(date, value)).toBe(value);
    },
  );

  it.each([
    "",
    "2023-02-29",
    "2024-02-30",
    "2024-13-01",
    "2024-00-10",
    "2024-1-01",
    "01/01/2024",
    "2024-01-01T00:00:00.000Z",
  ])("rejects %p", (value) => {
    expectInvalid(date, value, "date");
  });

  it("allows an empty value only when optional", () => {
    expect(expectValid(optionalDate, "")).toBe("");
    expectInvalid(optionalDate, "not-a-date", "date");
  });
});

describe("isoDateTimeString", () => {
  it.each([
    "2026-10-27T08:30",
    "2026-10-27T00:00",
    "2026-10-27T23:59:59",
  ])("accepts %s", (value) => {
    expect(expectValid(dateTime, value)).toBe(value);
  });

  it.each([
    "",
    "2026-10-27",
    "2026-10-27T24:00",
    "2026-10-27T10:60",
    "2026-10-27T10:00Z",
    "2026-10-27 10:00",
  ])("rejects %p", (value) => {
    expectInvalid(dateTime, value, "date");
  });
});
