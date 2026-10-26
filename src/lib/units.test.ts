import { Decimal } from "@prisma/client/runtime/client";
import {
  QUANTITY_SCALE,
  UnitConversionError,
  assertBaseUnit,
  assertSameKind,
  convertQuantity,
  roundQuantity,
  toBaseUnit,
  type ConvertibleUnit,
} from "./units";

const kg: ConvertibleUnit = {
  code: "kg",
  kind: "MASS",
  factorToBase: "1",
  isBase: true,
};
const g: ConvertibleUnit = {
  code: "g",
  kind: "MASS",
  factorToBase: "0.001",
  isBase: false,
};
const litre: ConvertibleUnit = {
  code: "L",
  kind: "VOLUME",
  factorToBase: "1",
  isBase: true,
};
const centilitre: ConvertibleUnit = {
  code: "cl",
  kind: "VOLUME",
  factorToBase: "0.01",
  isBase: false,
};
const piece: ConvertibleUnit = {
  code: "piece",
  kind: "COUNT",
  factorToBase: "1",
  isBase: true,
};
const dozen: ConvertibleUnit = {
  code: "dozen",
  kind: "COUNT",
  factorToBase: "12",
  isBase: false,
};

describe("convertQuantity", () => {
  it("converts a larger unit into a smaller one", () => {
    expect(convertQuantity(2, kg, g).toString()).toBe("2000");
  });

  it("converts a smaller unit into a larger one", () => {
    expect(convertQuantity(250, g, kg).toString()).toBe("0.25");
  });

  it("converts dozens into pieces", () => {
    expect(convertQuantity(2, dozen, piece).toString()).toBe("24");
  });

  it("converts litres into centilitres", () => {
    expect(convertQuantity(1, litre, centilitre).toString()).toBe("100");
  });

  it("returns the input when units are identical", () => {
    expect(convertQuantity("1.5", kg, kg).toString()).toBe("1.5");
  });

  it("accepts Decimal input and returns a Decimal", () => {
    const result = convertQuantity(new Decimal("0.1"), kg, g);
    expect(result).toBeInstanceOf(Decimal);
    expect(result.toString()).toBe("100");
  });

  it("does not drift on decimal quantities", () => {
    expect(convertQuantity("0.1", kg, g).toString()).toBe("100");
    expect(convertQuantity("0.3", kg, g).toString()).toBe("300");
  });

  it("rejects conversion between different unit kinds", () => {
    expect(() => convertQuantity(1, kg, litre)).toThrow(UnitConversionError);
    expect(() => convertQuantity(1, kg, litre)).toThrow(
      /different kinds/,
    );
  });

  it("rejects a zero conversion factor", () => {
    expect(() =>
      convertQuantity(1, kg, { ...kg, factorToBase: "0" }),
    ).toThrow(/zero conversion factor/);
  });
});

describe("toBaseUnit", () => {
  it("expresses a quantity in the base unit", () => {
    expect(toBaseUnit(250, g).toString()).toBe("0.25");
  });
});

describe("roundQuantity", () => {
  it("rounds to the persisted scale", () => {
    expect(roundQuantity("0.16666").toString()).toBe("0.1667");
    expect(roundQuantity("2").toString()).toBe("2");
    expect(QUANTITY_SCALE).toBe(4);
  });

  it("accepts an explicit scale", () => {
    expect(roundQuantity("1.23456", 2).toString()).toBe("1.23");
  });
});

describe("assertSameKind", () => {
  it("allows units of the same kind", () => {
    expect(() => assertSameKind(kg, g)).not.toThrow();
  });

  it("rejects units of different kinds", () => {
    expect(() => assertSameKind(piece, dozen)).not.toThrow();
    expect(() => assertSameKind(piece, litre)).toThrow(UnitConversionError);
  });
});

describe("assertBaseUnit", () => {
  it("accepts a base unit", () => {
    expect(() => assertBaseUnit(kg)).not.toThrow();
  });

  it("rejects a non-base stock unit", () => {
    expect(() => assertBaseUnit(g)).toThrow(/not a base unit/);
  });
});
