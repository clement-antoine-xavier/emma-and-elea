import {Decimal} from "@prisma/client/runtime/client";
import {computeCosting, type CostingInput, type CostingResult} from "./costing";

/**
 * Cost and price what-if. The simulation never persists anything: it scales the
 * resolved input prices, re-runs the pure costing engine and reports the delta.
 *
 * Percentages are applied to the current resolved values, so a 10 % material
 * increase compounds with an existing price change already stored in the
 * supplier list.
 */
export type CostAssumptions = {
  materialPct: string;
  packagingPct: string;
  labourPct: string;
  energyPct: string;
  /** Null keeps the current sale price. */
  salePrice: string | null;
};

export type SimulationResult = {
  base: CostingResult;
  simulated: CostingResult;
  costDeltaPct: string | null;
  marginDeltaPp: number | null;
};

function factor(pct: string): Decimal {
  return new Decimal(1).plus(new Decimal(pct).div(100));
}

function scale(value: string | null, pct: string): string | null {
  if (value === null) return null;
  return new Decimal(value).mul(factor(pct)).toString();
}

export function simulateCosting(
  input: CostingInput,
  assumptions: CostAssumptions,
): SimulationResult {
  const base = computeCosting(input);
  const simulatedInput: CostingInput = {
    ...input,
    salePrice:
      assumptions.salePrice === null ? input.salePrice : assumptions.salePrice,
    lines: input.lines.map((line) => ({
      ...line,
      unitCostPerStockUnit: scale(
        line.unitCostPerStockUnit,
        line.kind === "PACKAGING"
          ? assumptions.packagingPct
          : assumptions.materialPct,
      ),
    })),
    operations: input.operations.map((operation) =>
      operation.kind === "LABOUR"
        ? {
            ...operation,
            labourHourlyCost: scale(
              operation.labourHourlyCost,
              assumptions.labourPct,
            ),
          }
        : {
            ...operation,
            energyPricePerKwh: scale(
              operation.energyPricePerKwh,
              assumptions.energyPct,
            ),
          },
    ),
  };
  const simulated = computeCosting(simulatedInput);

  const costDeltaPct = base.costPerUnit.isZero()
    ? null
    : simulated.costPerUnit
        .minus(base.costPerUnit)
        .div(base.costPerUnit)
        .mul(100)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toString();
  const marginDeltaPp =
    base.marginPct && simulated.marginPct
      ? simulated.marginPct
          .minus(base.marginPct)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
          .toNumber()
      : null;

  return {base, simulated, costDeltaPct, marginDeltaPp};
}
