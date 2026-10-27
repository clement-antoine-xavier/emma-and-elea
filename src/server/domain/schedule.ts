import {Decimal} from "@prisma/client/runtime/client";

/**
 * Scheduling rules that do not need the database.
 *
 * Availability is expressed in site-local minutes (0 = Monday, matching the
 * schema) so a window is independent of the instant and DST. Shifts are
 * instants; the service converts them to the site timezone before asking these
 * helpers whether a window covers them.
 */

export type ZonedParts = {
  weekday: number;
  minutes: number;
  dateKey: string;
};

export type AvailabilityWindow = {
  weekday: number;
  startMinute: number;
  endMinute: number;
  validFrom: Date | null;
  validTo: Date | null;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function partMap(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function formatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = partMap(formatter(timeZone).formatToParts(date));
  const weekday = WEEKDAYS.indexOf(
    parts.weekday as (typeof WEEKDAYS)[number],
  );

  return {
    weekday: weekday === -1 ? 0 : weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function offsetMs(instant: Date, timeZone: string): number {
  const parts = partMap(formatter(timeZone).formatToParts(instant));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  );

  return asUtc - instant.getTime();
}

/** Converts a site-local wall-clock value (`YYYY-MM-DDTHH:MM`) to an instant. */
export function zonedDateTimeToUtc(value: string, timeZone: string): Date {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
  );
  if (!match) throw new Error(`Invalid local datetime: ${value}`);

  const naive = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );

  let instant = new Date(naive - offsetMs(new Date(naive), timeZone));
  instant = new Date(naive - offsetMs(instant, timeZone));
  instant = new Date(naive - offsetMs(instant, timeZone));

  return instant;
}

function dateKey(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/**
 * An employee with no declared availability is treated as flexible. Once a
 * window exists, the shift must fit within one of that weekday's windows.
 */
export function availabilityCovers(
  windows: readonly AvailabilityWindow[],
  shift: {weekday: number; startMinute: number; endMinute: number; dateKey: string},
): boolean {
  if (windows.length === 0) return true;

  return windows.some((window) => {
    if (window.weekday !== shift.weekday) return false;

    const from = dateKey(window.validFrom);
    const to = dateKey(window.validTo);
    if (from && shift.dateKey < from) return false;
    if (to && shift.dateKey > to) return false;

    return (
      window.startMinute <= shift.startMinute &&
      window.endMinute >= shift.endMinute
    );
  });
}

export function shiftsOverlap(
  first: {startsAt: Date; endsAt: Date},
  second: {startsAt: Date; endsAt: Date},
): boolean {
  return first.startsAt < second.endsAt && second.startsAt < first.endsAt;
}

export function absenceOverlaps(
  absence: {startsAt: Date; endsAt: Date},
  shift: {startsAt: Date; endsAt: Date},
): boolean {
  return shiftsOverlap(absence, shift);
}

export function shiftHours(startsAt: Date, endsAt: Date): Decimal {
  const hours = (endsAt.getTime() - startsAt.getTime()) / 3_600_000;
  return new Decimal(hours).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function startOfWeek(date: Date): Date {
  const day = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const weekday = day.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;

  return new Date(day.getTime() + offset * 86_400_000);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
