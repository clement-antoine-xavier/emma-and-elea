import {createHash} from "node:crypto";
import {Decimal} from "@prisma/client/runtime/client";
import {
  convertQuantity,
  roundQuantity,
  type ConvertibleUnit,
  type QuantityInput,
} from "./units";
import {MONEY_SCALE} from "./receipt";

/**
 * Layered recipe costing (ADR-0010).
 *
 * Material and packaging amounts come from quantities converted to the item's
 * base stock unit, adjusted for loss. Labour comes from active minutes and a
 * fully loaded hourly rate. Energy comes from equipment power, operation
 * duration and the site tariff. Overhead is a percentage of those four.
 *
 * The engine is pure: the service resolves prices, rates and tariffs from the
 * database and persists the returned snapshot lines.
 */

export type CostLineKindName =
  | "MATERIAL"
  | "PACKAGING"
  | "LABOUR"
  | "ENERGY"
  | "OVERHEAD";

export type CostWarning = {
  code: "MISSING_PRICE" | "MISSING_RATE" | "MISSING_TARIFF";
  subject: string;
};

export type CostingLineInput = {
  kind: "MATERIAL" | "PACKAGING";
  itemId: string;
  label: string;
  quantity: QuantityInput;
  unit: ConvertibleUnit;
  stockUnit: ConvertibleUnit;
  stockUnitId: string;
  lossPct: QuantityInput;
  isOptional: boolean;
  /** Price per base stock unit, or null when no supplier or receipt price exists. */
  unitCostPerStockUnit: string | null;
  /** Set for a produced batch, where the exact consumed lot is known. */
  lotId?: string | null;
};

export type CostingOperationInput = {
  kind: "LABOUR" | "ENERGY";
  recipeOperationId: string;
  label: string;
  durationMinutes: number;
  activeMinutes: number | null;
  labourHourlyCost: string | null;
  equipmentPowerKw: string | null;
  energyPricePerKwh: string | null;
};

export type CostingInput = {
  yieldQuantity: QuantityInput;
  overheadPct: QuantityInput;
  salePrice: string | null;
  currency: string;
  lines: readonly CostingLineInput[];
  operations: readonly CostingOperationInput[];
};

export type CostLineDraft = {
  kind: CostLineKindName;
  itemId: string | null;
  lotId: string | null;
  recipeOperationId: string | null;
  label: string;
  quantity: Decimal | null;
  unitId: string | null;
  unitCost: Decimal | null;
  amount: Decimal;
  position: number;
};

export type CostingResult = {
  materialCost: Decimal;
  packagingCost: Decimal;
  labourCost: Decimal;
  energyCost: Decimal;
  overheadCost: Decimal;
  totalCost: Decimal;
  costPerUnit: Decimal;
  marginPct: Decimal | null;
  currency: string;
  lines: CostLineDraft[];
  warnings: CostWarning[];
};

function money(value: Decimal): Decimal {
  return value.toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
}

function decimalString(value: QuantityInput): string {
  return new Decimal(value).toFixed();
}

function unitSignature(unit: ConvertibleUnit): readonly string[] {
  return [unit.code, unit.kind, decimalString(unit.factorToBase)];
}

/**
 * Fingerprint of every input that can move a stored cost: resolved prices,
 * quantities, units, losses, rates, tariffs and overhead. The sale price is
 * deliberately excluded: a price change moves the margin, not the cost, and
 * the reports recompute the margin from the current sale price.
 *
 * Snapshots written before this helper existed have a null hash and are
 * treated as stale until refreshed.
 */
export function costInputHash(input: CostingInput): string {
  const payload = {
    currency: input.currency,
    yieldQuantity: decimalString(input.yieldQuantity),
    overheadPct: decimalString(input.overheadPct),
    lines: input.lines.map((line) => ({
      kind: line.kind,
      itemId: line.itemId,
      quantity: decimalString(line.quantity),
      unit: unitSignature(line.unit),
      stockUnit: unitSignature(line.stockUnit),
      stockUnitId: line.stockUnitId,
      lossPct: decimalString(line.lossPct),
      isOptional: line.isOptional,
      unitCost:
        line.unitCostPerStockUnit === null
          ? null
          : decimalString(line.unitCostPerStockUnit),
      lotId: line.lotId ?? null,
    })),
    operations: input.operations.map((operation) => ({
      kind: operation.kind,
      durationMinutes: operation.durationMinutes,
      activeMinutes: operation.activeMinutes,
      labourHourlyCost:
        operation.labourHourlyCost === null
          ? null
          : decimalString(operation.labourHourlyCost),
      equipmentPowerKw:
        operation.equipmentPowerKw === null
          ? null
          : decimalString(operation.equipmentPowerKw),
      energyPricePerKwh:
        operation.energyPricePerKwh === null
          ? null
          : decimalString(operation.energyPricePerKwh),
    })),
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * Converts a supplier pack price to a price per base stock unit. A 25 kg pack
 * at €27.50 gives €1.10 per kg.
 */
export function packPricePerStockUnit(
  packPrice: QuantityInput,
  packQuantity: QuantityInput,
  packUnit: ConvertibleUnit,
  stockUnit: ConvertibleUnit,
): Decimal {
  const baseQuantity = convertQuantity(packQuantity, packUnit, stockUnit);

  if (baseQuantity.isZero()) {
    throw new Error("A pack quantity cannot be zero.");
  }

  return money(new Decimal(packPrice).div(baseQuantity));
}

export function computeCosting(input: CostingInput): CostingResult {
  const yieldQuantity = new Decimal(input.yieldQuantity);
  if (yieldQuantity.lessThanOrEqualTo(0)) {
    throw new Error("A recipe yield must be greater than zero.");
  }

  const lines: CostLineDraft[] = [];
  const warnings: CostWarning[] = [];

  let materialCost = new Decimal(0);
  let packagingCost = new Decimal(0);
  let labourCost = new Decimal(0);
  let energyCost = new Decimal(0);
  let position = 0;

  for (const line of input.lines) {
    if (line.isOptional) continue;

    const baseQuantity = roundQuantity(
      convertQuantity(line.quantity, line.unit, line.stockUnit),
    );
    const lossFactor = new Decimal(1).plus(
      new Decimal(line.lossPct).div(100),
    );
    const quantityWithLoss = roundQuantity(baseQuantity.mul(lossFactor));

    if (line.unitCostPerStockUnit === null) {
      warnings.push({code: "MISSING_PRICE", subject: line.label});
    }

    const unitCost =
      line.unitCostPerStockUnit === null
        ? new Decimal(0)
        : new Decimal(line.unitCostPerStockUnit);
    const amount = money(quantityWithLoss.mul(unitCost));

    if (line.kind === "MATERIAL") materialCost = materialCost.plus(amount);
    else packagingCost = packagingCost.plus(amount);

    lines.push({
      kind: line.kind,
      itemId: line.itemId,
      lotId: line.lotId ?? null,
      recipeOperationId: null,
      label: line.label,
      quantity: quantityWithLoss,
      unitId: line.stockUnitId,
      unitCost: money(unitCost),
      amount,
      position: position++,
    });
  }

  for (const operation of input.operations) {
    if (operation.kind === "LABOUR") {
      const minutes = operation.activeMinutes ?? operation.durationMinutes;

      if (operation.labourHourlyCost === null) {
        warnings.push({code: "MISSING_RATE", subject: operation.label});
      }

      const amount =
        operation.labourHourlyCost === null
          ? new Decimal(0)
          : money(
              new Decimal(operation.labourHourlyCost)
                .mul(minutes)
                .div(60),
            );

      labourCost = labourCost.plus(amount);

      lines.push({
        kind: "LABOUR",
        itemId: null,
        lotId: null,
        recipeOperationId: operation.recipeOperationId,
        label: operation.label,
        quantity: new Decimal(minutes),
        unitId: null,
        unitCost:
          operation.labourHourlyCost === null
            ? null
            : money(new Decimal(operation.labourHourlyCost)),
        amount,
        position: position++,
      });
    } else {
      if (
        operation.equipmentPowerKw === null ||
        operation.energyPricePerKwh === null
      ) {
        warnings.push({code: "MISSING_TARIFF", subject: operation.label});
      }

      const amount =
        operation.equipmentPowerKw === null ||
        operation.energyPricePerKwh === null
          ? new Decimal(0)
          : money(
              new Decimal(operation.equipmentPowerKw)
                .mul(operation.durationMinutes)
                .div(60)
                .mul(operation.energyPricePerKwh),
            );

      energyCost = energyCost.plus(amount);

      lines.push({
        kind: "ENERGY",
        itemId: null,
        lotId: null,
        recipeOperationId: operation.recipeOperationId,
        label: operation.label,
        quantity: new Decimal(operation.durationMinutes),
        unitId: null,
        unitCost:
          operation.energyPricePerKwh === null
            ? null
            : money(new Decimal(operation.energyPricePerKwh)),
        amount,
        position: position++,
      });
    }
  }

  materialCost = money(materialCost);
  packagingCost = money(packagingCost);
  labourCost = money(labourCost);
  energyCost = money(energyCost);

  const subtotal = materialCost
    .plus(packagingCost)
    .plus(labourCost)
    .plus(energyCost);
  const overheadCost = money(
    subtotal.mul(new Decimal(input.overheadPct)).div(100),
  );
  const totalCost = money(subtotal.plus(overheadCost));
  const costPerUnit = money(totalCost.div(yieldQuantity));

  let marginPct: Decimal | null = null;
  if (input.salePrice !== null) {
    const salePrice = new Decimal(input.salePrice);
    if (salePrice.greaterThan(0)) {
      marginPct = money(
        salePrice.minus(costPerUnit).div(salePrice).mul(100),
      ).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }
  }

  const overheadLine: CostLineDraft = {
    kind: "OVERHEAD",
    itemId: null,
    lotId: null,
    recipeOperationId: null,
    label: `Overhead ${new Decimal(input.overheadPct).toString()}%`,
    quantity: null,
    unitId: null,
    unitCost: null,
    amount: overheadCost,
    position: position++,
  };

  return {
    materialCost,
    packagingCost,
    labourCost,
    energyCost,
    overheadCost,
    totalCost,
    costPerUnit,
    marginPct,
    currency: input.currency,
    lines: [...lines, overheadLine],
    warnings,
  };
}
