import {Decimal} from "@prisma/client/runtime/client";
import {
  roundQuantity,
  type QuantityInput,
} from "./units";

/**
 * Demand forecast for one site and one produced item.
 *
 * History comes from `SalesDaily`, already converted to the item stock unit.
 * The calculator prefers the same weekday (weekly seasonality) and falls back
 * to the overall daily average when that weekday has no sales. The safety
 * buffer and an optional event uplift are applied to the average, never to the
 * raw total. It is pure so the date maths and rounding stay unit-testable.
 */
export type ForecastHistoryPoint = {
  businessDate: Date;
  quantity: QuantityInput;
};

export type ForecastInput = {
  targetDate: Date;
  from: Date;
  to: Date;
  history: readonly ForecastHistoryPoint[];
  safetyPct: QuantityInput;
  eventUpliftPct?: QuantityInput | null;
};

export type ForecastResult = {
  historyQuantity: Decimal;
  averageQuantity: Decimal;
  suggestedQuantity: Decimal;
  basis: "WEEKDAY" | "AVERAGE" | "NONE";
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calendarDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
}

function dayKey(date: Date): string {
  return calendarDay(date).toISOString().slice(0, 10);
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(
    0,
    Math.round((calendarDay(to).getTime() - calendarDay(from).getTime()) / MS_PER_DAY) +
      1,
  );
}

export function forecastQuantity(input: ForecastInput): ForecastResult {
  const from = calendarDay(input.from);
  const to = calendarDay(input.to);
  const target = calendarDay(input.targetDate);
  const totalDays = daysBetween(from, to);

  if (totalDays === 0) {
    return {
      historyQuantity: new Decimal(0),
      averageQuantity: new Decimal(0),
      suggestedQuantity: new Decimal(0),
      basis: "NONE",
    };
  }

  const targetWeekday = target.getUTCDay();
  const allDays: Date[] = [];
  for (let index = 0; index < totalDays; index += 1) {
    const day = new Date(from.getTime() + index * MS_PER_DAY);
    allDays.push(day);
  }

  const sameWeekday = new Set(
    allDays
      .filter((day) => day.getUTCDay() === targetWeekday)
      .map(dayKey),
  );

  let total = new Decimal(0);
  let weekdayTotal = new Decimal(0);

  for (const point of input.history) {
    const key = dayKey(point.businessDate);
    const quantity = new Decimal(point.quantity);
    total = total.plus(quantity);
    if (sameWeekday.has(key)) {
      weekdayTotal = weekdayTotal.plus(quantity);
    }
  }

  const usesWeekday = !weekdayTotal.isZero() && sameWeekday.size > 0;
  const basis = usesWeekday
    ? "WEEKDAY"
    : total.isZero()
      ? "NONE"
      : "AVERAGE";
  const denominator = usesWeekday ? sameWeekday.size : totalDays;
  const numerator = usesWeekday ? weekdayTotal : total;
  const average = numerator.div(denominator);
  const uplift = new Decimal(input.safetyPct).plus(
    input.eventUpliftPct ?? 0,
  );
  const factor = new Decimal(1).plus(uplift.div(100));
  const rawSuggested = factor.isNegative()
    ? new Decimal(0)
    : average.mul(factor);

  return {
    historyQuantity: roundQuantity(total),
    averageQuantity: roundQuantity(average),
    suggestedQuantity: roundQuantity(rawSuggested),
    basis,
  };
}
