import {Decimal} from "@prisma/client/runtime/client";
import {
  convertQuantity,
  roundQuantity,
  type ConvertibleUnit,
  type QuantityInput,
} from "./units";

/**
 * Purchase receipt posting math.
 *
 * A receipt line may be expressed in any unit of the item's kind (a 25 kg sack,
 * 500 g, one piece), while the ledger only stores the item's base stock unit.
 * These functions are the single place where that conversion happens for
 * purchasing; the repository calls them inside the posting transaction.
 */

export const MONEY_SCALE = 4;

export function receiptLineTotal(
  quantity: QuantityInput,
  unitPrice: QuantityInput,
): Decimal {
  return new Decimal(quantity)
    .mul(unitPrice)
    .toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
}

export function receiptTotal(
  lines: ReadonlyArray<{lineTotal: QuantityInput}>,
): Decimal {
  return lines
    .reduce(
      (total, line) => total.plus(new Decimal(line.lineTotal)),
      new Decimal(0),
    )
    .toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
}

/** The quantity that enters the lot, in the item's base stock unit. */
export function stockQuantity(
  quantity: QuantityInput,
  lineUnit: ConvertibleUnit,
  stockUnit: ConvertibleUnit,
): Decimal {
  return roundQuantity(convertQuantity(quantity, lineUnit, stockUnit));
}

/** The line price converted to a price per base stock unit. */
export function stockUnitCost(
  unitPrice: QuantityInput,
  lineUnit: ConvertibleUnit,
  stockUnit: ConvertibleUnit,
): Decimal {
  const factor = convertQuantity(1, lineUnit, stockUnit);

  if (factor.isZero()) {
    throw new Error("A conversion factor cannot be zero.");
  }

  return new Decimal(unitPrice)
    .div(factor)
    .toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
}

function yyMMdd(date: Date): string {
  const year = String(date.getUTCFullYear()).slice(2).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

/** Expands the organization's lot pattern: `{site}`, `{yyMMdd}`, `{seq}`. */
export function buildLotNumber(
  pattern: string,
  input: {siteCode: string; date: Date; sequence: number},
): string {
  return pattern
    .replaceAll("{site}", input.siteCode)
    .replaceAll("{yyMMdd}", yyMMdd(input.date))
    .replaceAll("{seq}", String(input.sequence).padStart(3, "0"));
}

/**
 * Next number for a document prefix such as `GR-261027`. Existing numbers that
 * do not share the prefix are ignored. The unique index is the final guard
 * against two users posting at the same moment.
 */
export function nextDocumentSequence(
  existingNumbers: readonly string[],
  prefix: string,
): number {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`);

  return existingNumbers.reduce((highest, number) => {
    const match = number.match(pattern);
    const value = match ? Number(match[1]) : 0;
    return Math.max(highest, value);
  }, 0) + 1;
}

export function receiptNumberPrefix(date: Date): string {
  return `GR-${yyMMdd(date)}`;
}
