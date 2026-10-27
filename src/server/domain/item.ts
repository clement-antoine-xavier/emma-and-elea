import {DomainError} from "@/server/domain/errors";
import type {ItemTypeName} from "@/lib/dto";

/**
 * Catalogue invariants (ADR-0010, docs/ERD.md).
 *
 * The ledger sums `StockMovement.quantity` without converting units, so an
 * item must stock in a base unit. Sale and recipe units may differ, but they
 * must measure the same kind of quantity.
 */

export type UnitKindName = "MASS" | "VOLUME" | "COUNT" | "LENGTH";

export type ItemUnit = {
  id: string;
  kind: UnitKindName;
  isBase: boolean;
};

export type ItemRulesInput = {
  type: ItemTypeName;
  stockUnit: ItemUnit;
  saleUnit: ItemUnit | null;
  salePrice: string | null;
  isSellable: boolean;
};

/** Semi-finished and finished products may come from a recipe; nothing else may. */
export function deriveProducedFlag(
  type: ItemTypeName,
  isProduced: boolean,
): boolean {
  if (type === "SEMI_FINISHED") return true;
  if (type === "FINISHED_PRODUCT") return isProduced;
  return false;
}

export function assertItemInvariants(input: ItemRulesInput): void {
  if (!input.stockUnit.isBase) {
    throw new DomainError(
      "INVALID_UNIT",
      "An item must stock in the base unit of its kind.",
    );
  }

  if (input.saleUnit && input.saleUnit.kind !== input.stockUnit.kind) {
    throw new DomainError(
      "INVALID_UNIT",
      "The sale unit must measure the same kind of quantity as the stock unit.",
    );
  }

  if (input.isSellable && !input.saleUnit) {
    throw new DomainError(
      "INVALID_INPUT",
      "A sellable item needs a sale unit.",
    );
  }

  if (input.isSellable && !input.salePrice) {
    throw new DomainError(
      "INVALID_INPUT",
      "A sellable item needs a sale price.",
    );
  }
}
