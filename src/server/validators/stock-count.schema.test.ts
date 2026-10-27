import {
  stockCountIdSchema,
  stockCountInputSchema,
  stockCountLinesSchema,
} from "@/server/validators/stock-count.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const t = (key: string) => key;
const input = stockCountInputSchema(t);
const lines = stockCountLinesSchema(t);

describe("stockCountInputSchema", () => {
  it("accepts a session with no note", () => {
    expectValid(input, {
      siteId: "site_1",
      countedAt: "2026-10-27",
      note: "",
    });
  });

  it.each([
    [{siteId: ""}, "siteRequired"],
    [{countedAt: "2026-10-27T08:00"}, "dateInvalid"],
    [{note: "x".repeat(301)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(
      input,
      {siteId: "site_1", countedAt: "2026-10-27", note: "", ...overrides},
      message,
    );
  });
});

describe("stockCountLinesSchema", () => {
  it("accepts a line with zero counted quantity", () => {
    expectValid(lines, {
      lines: [{id: "line_1", countedQuantity: "0"}],
    });
  });

  it("accepts several lines with decimals", () => {
    expectValid(lines, {
      lines: [
        {id: "line_1", countedQuantity: "1.5"},
        {id: "line_2", countedQuantity: "0"},
      ],
    });
  });

  it("requires at least one line", () => {
    expectInvalid(lines, {lines: []}, "linesRequired");
  });

  it.each([
    [{id: "", countedQuantity: "1"}, "linesRequired"],
    [{id: "line_1", countedQuantity: "-1"}, "quantityInvalid"],
    [{id: "line_1", countedQuantity: "1.23456"}, "quantityInvalid"],
    [{id: "line_1", countedQuantity: "abc"}, "quantityInvalid"],
  ])("rejects %p", (line, message) => {
    expectInvalid(lines, {lines: [line]}, message);
  });

  it("rejects a blank session id", () => {
    expectInvalid(stockCountIdSchema, {id: ""});
  });
});
