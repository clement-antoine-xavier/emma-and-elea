import { Decimal } from "@prisma/client/runtime/client";

/**
 * Unit conversion is the single place where quantity arithmetic may change
 * scale. Everything else stores quantities in an item's base stock unit, so
 * ledger sums never need a conversion. See `docs/ERD.md`, invariant 6.
 */

export type UnitKindName = "MASS" | "VOLUME" | "COUNT" | "LENGTH";

export type QuantityInput = Decimal | string | number;

export interface ConvertibleUnit {
  code: string;
  kind: UnitKindName;
  factorToBase: Decimal | string | number;
  isBase?: boolean;
}

export class UnitConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnitConversionError";
  }
}

/** Quantities are persisted with four decimals, so conversions land on that scale. */
export const QUANTITY_SCALE = 4;

/** Throws unless both units measure the same kind of quantity. */
export function assertSameKind(
  from: ConvertibleUnit,
  to: ConvertibleUnit,
): void {
  if (from.kind !== to.kind) {
    throw new UnitConversionError(
      `Cannot convert ${from.code} (${from.kind}) to ${to.code} (${to.kind}): units belong to different kinds.`,
    );
  }
}

/** Expresses a quantity in the base unit of its kind (kg, L, piece, m). */
export function toBaseUnit(
  quantity: QuantityInput,
  unit: ConvertibleUnit,
): Decimal {
  return new Decimal(quantity).mul(unit.factorToBase);
}

/** Converts a quantity between two units of the same kind. */
export function convertQuantity(
  quantity: QuantityInput,
  from: ConvertibleUnit,
  to: ConvertibleUnit,
): Decimal {
  assertSameKind(from, to);

  const factor = new Decimal(to.factorToBase);
  if (factor.isZero()) {
    throw new UnitConversionError(
      `Unit ${to.code} has a zero conversion factor.`,
    );
  }

  return toBaseUnit(quantity, from).div(factor);
}

/** Rounds a quantity to the database scale, half up. */
export function roundQuantity(
  quantity: QuantityInput,
  scale = QUANTITY_SCALE,
): Decimal {
  return new Decimal(quantity).toDecimalPlaces(scale, Decimal.ROUND_HALF_UP);
}

/**
 * Items must stock in a base unit. `g` is a display and input unit, not a
 * stock unit, because `StockMovement.quantity` is summed without conversion.
 */
export function assertBaseUnit(unit: ConvertibleUnit): void {
  if (!unit.isBase) {
    throw new UnitConversionError(
      `Unit ${unit.code} is not a base unit; items must stock in a base unit.`,
    );
  }
}
