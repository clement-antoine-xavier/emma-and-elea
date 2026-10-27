/**
 * Display formatting for money, quantities and business dates.
 *
 * Values reach the client as strings for two reasons: Prisma `Decimal` is not
 * serializable across the Server Component boundary, and a number would lose
 * precision for quantities such as grams. This module converts to `number`
 * only for presentation; arithmetic stays in `Decimal` on the server.
 */

export type FormattableValue = string | number | null | undefined;

const FALLBACK = "—";

function toFiniteNumber(value: FormattableValue): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function formatMoney(
  value: FormattableValue,
  options: {
    locale: string;
    currency: string;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    fallback?: string;
  },
): string {
  const amount = toFiniteNumber(value);
  if (amount === null) return options.fallback ?? FALLBACK;

  return new Intl.NumberFormat(options.locale, {
    style: "currency",
    currency: options.currency,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(amount);
}

export function formatQuantity(
  value: FormattableValue,
  options: {
    locale: string;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    fallback?: string;
  },
): string {
  const quantity = toFiniteNumber(value);
  if (quantity === null) return options.fallback ?? FALLBACK;

  return new Intl.NumberFormat(options.locale, {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 3,
  }).format(quantity);
}

export function formatPercent(
  value: FormattableValue,
  options: {
    locale: string;
    maximumFractionDigits?: number;
    fallback?: string;
  },
): string {
  const percent = toFiniteNumber(value);
  if (percent === null) return options.fallback ?? FALLBACK;

  return new Intl.NumberFormat(options.locale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
  }).format(percent / 100);
}

/**
 * `businessDate` and the other `@db.Date` columns are calendar days, not
 * instants. They are stored at UTC midnight and must be rendered without a
 * timezone shift; `timeZone: "UTC"` keeps the day the database stored.
 */
export function formatBusinessDate(
  value: string | Date | null | undefined,
  options: {
    locale: string;
    dateStyle?: "short" | "medium" | "long";
    fallback?: string;
  },
): string {
  if (!value) return options.fallback ?? FALLBACK;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return options.fallback ?? FALLBACK;

  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: options.dateStyle ?? "medium",
    timeZone: "UTC",
  }).format(date);
}

/** An instant rendered in the site's timezone (shifts and absences). */
export function formatDateTime(
  value: string | Date | null | undefined,
  options: {
    locale: string;
    timeZone: string;
    fallback?: string;
  },
): string {
  if (!value) return options.fallback ?? FALLBACK;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return options.fallback ?? FALLBACK;

  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: options.timeZone,
  }).format(date);
}

/** Minutes from midnight as a `HH:MM` label. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** The calendar date of an instant in a specific timezone. */
export function formatZonedDate(
  value: string | Date | null | undefined,
  options: {locale: string; timeZone: string; fallback?: string},
): string {
  if (!value) return options.fallback ?? FALLBACK;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return options.fallback ?? FALLBACK;

  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: "medium",
    timeZone: options.timeZone,
  }).format(date);
}

/** The time of day of an instant in a specific timezone. */
export function formatZonedTime(
  value: string | Date | null | undefined,
  options: {locale: string; timeZone: string; fallback?: string},
): string {
  if (!value) return options.fallback ?? FALLBACK;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return options.fallback ?? FALLBACK;

  return new Intl.DateTimeFormat(options.locale, {
    timeStyle: "short",
    timeZone: options.timeZone,
  }).format(date);
}
