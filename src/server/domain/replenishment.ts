import {Decimal} from "@prisma/client/runtime/client";

/**
 * Suggested purchase quantity for one item at one site.
 *
 * The threshold is the par level when set, otherwise the minimum stock. Open
 * draft receipts are subtracted so two suggestions do not order the same stock
 * twice. The result is in the item stock unit and never negative.
 */
export function suggestedOrderQuantity(input: {
  onHand: string;
  openDraftQuantity: string;
  minStockQuantity: string | null;
  parLevelQuantity: string | null;
}): Decimal | null {
  const thresholdValue = input.parLevelQuantity ?? input.minStockQuantity;
  if (thresholdValue === null) return null;

  const threshold = new Decimal(thresholdValue);
  const onHand = new Decimal(input.onHand);
  const open = new Decimal(input.openDraftQuantity);
  const suggested = threshold.minus(onHand).minus(open);

  return suggested.isNegative() || suggested.isZero()
    ? new Decimal(0)
    : suggested.toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
}
