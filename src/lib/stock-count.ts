import { Decimal } from "@prisma/client/runtime/client";
import { roundQuantity, type QuantityInput } from "./units";

/**
 * A physical inventory line is always expressed in the item's base stock unit,
 * so counts can be compared with the ledger without conversion. See
 * `docs/ERD.md`, invariant 7 and the StockCount section.
 */
export interface CountLineInput {
  lotId: string | null;
  itemId: string;
  unitId: string;
  expectedQuantity: QuantityInput;
  countedQuantity: QuantityInput;
}

/**
 * The movement a posted count must append. Mirrors `StockMovement`:
 * `quantity` is signed, and `(referenceType, referenceId)` points back to the
 * session.
 */
export interface CountMovementDraft {
  lotId: string | null;
  itemId: string;
  unitId: string;
  type: "COUNT";
  quantity: Decimal;
  referenceType: "STOCK_COUNT";
  referenceId: string;
  reason: string;
}

/** Positive when more was counted than expected, negative when less. */
export function computeVariance(
  expectedQuantity: QuantityInput,
  countedQuantity: QuantityInput,
): Decimal {
  return roundQuantity(
    new Decimal(countedQuantity).minus(new Decimal(expectedQuantity)),
  );
}

/**
 * Turns the lines of a session into ledger movements, skipping lines that
 * match exactly. Posting is what persists these drafts; keeping the mapping
 * pure makes the sign and rounding rules testable.
 */
export function countMovements(
  stockCountId: string,
  lines: readonly CountLineInput[],
): CountMovementDraft[] {
  if (!stockCountId) {
    throw new Error("A stock count id is required to build movements.");
  }

  return lines.flatMap((line) => {
    const variance = computeVariance(
      line.expectedQuantity,
      line.countedQuantity,
    );

    if (variance.isZero()) return [];

    return [
      {
        lotId: line.lotId,
        itemId: line.itemId,
        unitId: line.unitId,
        type: "COUNT" as const,
        quantity: variance,
        referenceType: "STOCK_COUNT" as const,
        referenceId: stockCountId,
        reason: "Stock count",
      },
    ];
  });
}
