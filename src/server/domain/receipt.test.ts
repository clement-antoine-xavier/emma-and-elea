import {
  buildLotNumber,
  nextDocumentSequence,
  receiptLineTotal,
  receiptNumberPrefix,
  receiptTotal,
  stockQuantity,
  stockUnitCost,
} from "@/server/domain/receipt";

const kg = {
  code: "kg",
  kind: "MASS" as const,
  factorToBase: 1,
  isBase: true,
};
const g = {
  code: "g",
  kind: "MASS" as const,
  factorToBase: "0.001",
  isBase: false,
};
const piece = {
  code: "piece",
  kind: "COUNT" as const,
  factorToBase: 1,
  isBase: true,
};

describe("receipt posting", () => {
  it("converts a line quantity to the item's stock unit", () => {
    expect(stockQuantity("500", g, kg).toString()).toBe("0.5");
    expect(stockQuantity("2", piece, piece).toString()).toBe("2");
  });

  it("converts a line price to a price per stock unit", () => {
    expect(stockUnitCost("10", g, kg).toString()).toBe("10000");
    expect(stockUnitCost("18.5", kg, kg).toString()).toBe("18.5");
  });

  it("computes line totals and receipt totals at four decimals", () => {
    const line = receiptLineTotal("25", "27.5");
    expect(line.toString()).toBe("687.5");
    expect(
      receiptTotal([
        {lineTotal: line},
        {lineTotal: receiptLineTotal("10", "78")},
      ]).toString(),
    ).toBe("1467.5");
  });

  it("builds a lot number from the organization pattern", () => {
    expect(
      buildLotNumber("{site}-{yyMMdd}-{seq}", {
        siteCode: "ATL",
        date: new Date("2026-10-27T12:00:00.000Z"),
        sequence: 4,
      }),
    ).toBe("ATL-261027-004");
  });

  it("continues a document number sequence", () => {
    const prefix = receiptNumberPrefix(
      new Date("2026-10-27T12:00:00.000Z"),
    );
    expect(prefix).toBe("GR-261027");
    expect(
      nextDocumentSequence(
        ["GR-261027-001", "GR-261027-007", "GR-261026-099"],
        prefix,
      ),
    ).toBe(8);
    expect(nextDocumentSequence([], prefix)).toBe(1);
  });
});
