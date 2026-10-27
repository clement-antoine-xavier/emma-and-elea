import {Decimal} from "@prisma/client/runtime/client";
import {convertQuantity, roundQuantity, type ConvertibleUnit, type QuantityInput} from "./units";

/**
 * Batch input allocation.
 *
 * A batch consumes each recipe line scaled by actual yield / recipe yield, with
 * the line's loss percentage, in the item's base stock unit. Lots are consumed
 * FEFO: earliest expiry first, lots without an expiry after dated ones, then
 * earliest receipt.
 */

export type ProductionRequirement = {
  itemId: string;
  itemName: string;
  itemType: "RAW_MATERIAL" | "PACKAGING" | "SEMI_FINISHED" | "FINISHED_PRODUCT";
  unit: ConvertibleUnit;
  stockUnit: ConvertibleUnit;
  unitId: string;
  quantity: QuantityInput;
  lossPct: QuantityInput;
};

export type ScaledRequirement = {
  itemId: string;
  itemName: string;
  itemType: ProductionRequirement["itemType"];
  unitId: string;
  quantity: Decimal;
};

export function scaleRequirement(
  requirement: ProductionRequirement,
  scale: QuantityInput,
): ScaledRequirement {
  const base = convertQuantity(
    requirement.quantity,
    requirement.unit,
    requirement.stockUnit,
  );
  const withLoss = base.mul(
    new Decimal(1).plus(new Decimal(requirement.lossPct).div(100)),
  );

  return {
    itemId: requirement.itemId,
    itemName: requirement.itemName,
    itemType: requirement.itemType,
    unitId: requirement.unitId,
    quantity: roundQuantity(withLoss.mul(scale)),
  };
}

export type AvailableLot = {
  id: string;
  lotNumber: string;
  itemId: string;
  itemName: string;
  itemType: ProductionRequirement["itemType"];
  quantityRemaining: QuantityInput;
  unitCost: QuantityInput;
  unitId: string;
  unitCode: string;
  unitKind: "MASS" | "VOLUME" | "COUNT" | "LENGTH";
  unitFactorToBase: string;
  expiresOn: Date | null;
  receivedAt: Date;
};

export type LotAllocation = {
  lotId: string;
  lotNumber: string;
  itemId: string;
  itemName: string;
  itemType: ProductionRequirement["itemType"];
  quantity: Decimal;
  unitId: string;
  unitCost: Decimal;
  expiresOn: Date | null;
};

export type AllocationShortage = {
  itemId: string;
  itemName: string;
  required: string;
  available: string;
};

export type AllocationResult = {
  allocations: LotAllocation[];
  shortages: AllocationShortage[];
};

/** FEFO: dated lots first by expiry, then undated, then oldest receipt. */
export function compareLots(a: AvailableLot, b: AvailableLot): number {
  if (a.expiresOn && b.expiresOn) {
    return a.expiresOn.getTime() - b.expiresOn.getTime();
  }
  if (a.expiresOn) return -1;
  if (b.expiresOn) return 1;

  return a.receivedAt.getTime() - b.receivedAt.getTime();
}

export function allocateFefo(
  requirements: readonly ScaledRequirement[],
  lots: readonly AvailableLot[],
): AllocationResult {
  const allocations: LotAllocation[] = [];
  const shortages: AllocationShortage[] = [];

  const lotsByItem = new Map<string, AvailableLot[]>();
  for (const lot of lots) {
    if (new Decimal(lot.quantityRemaining).lessThanOrEqualTo(0)) continue;
    const bucket = lotsByItem.get(lot.itemId) ?? [];
    bucket.push(lot);
    lotsByItem.set(lot.itemId, bucket);
  }
  for (const bucket of lotsByItem.values()) bucket.sort(compareLots);

  for (const requirement of requirements) {
    let remaining = requirement.quantity;
    const availableLots = lotsByItem.get(requirement.itemId) ?? [];

    for (const lot of availableLots) {
      if (remaining.lessThanOrEqualTo(0)) break;

      const lotRemaining = new Decimal(lot.quantityRemaining);
      if (lotRemaining.lessThanOrEqualTo(0)) continue;

      const take = Decimal.min(lotRemaining, remaining);
      remaining = remaining.minus(take);

      allocations.push({
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        itemId: lot.itemId,
        itemName: lot.itemName,
        itemType: requirement.itemType,
        quantity: roundQuantity(take),
        unitId: requirement.unitId,
        unitCost: new Decimal(lot.unitCost),
        expiresOn: lot.expiresOn,
      });
    }

    if (remaining.greaterThan(0)) {
      shortages.push({
        itemId: requirement.itemId,
        itemName: requirement.itemName,
        required: requirement.quantity.toString(),
        available: requirement.quantity.minus(remaining).toString(),
      });
    }
  }

  return {allocations, shortages};
}
