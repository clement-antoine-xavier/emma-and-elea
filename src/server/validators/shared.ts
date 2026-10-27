import {z} from "zod";

/**
 * Shared field builders for the settings and catalogue forms. Values stay
 * strings on the wire so a quantity or a price never round-trips through a
 * JavaScript number before it reaches Prisma `Decimal`; the service passes
 * them through.
 */

export type DecimalOptions = {
  min?: number;
  max?: number;
  scale?: number;
};

export function isDecimalText(value: string, options: DecimalOptions = {}) {
  const {min = 0, max = Number.MAX_SAFE_INTEGER, scale = 4} = options;

  if (!/^\d+(?:\.\d+)?$/.test(value)) return false;

  const fraction = value.split(".")[1]?.length ?? 0;
  const amount = Number(value);

  return (
    Number.isFinite(amount) &&
    amount >= min &&
    amount <= max &&
    fraction <= scale
  );
}

export function decimalString(options: DecimalOptions & {message: string}) {
  const {message, ...limits} = options;

  return z
    .string()
    .trim()
    .refine((value) => isDecimalText(value, limits), message);
}

export function optionalDecimalString(
  options: DecimalOptions & {message: string},
) {
  const {message, ...limits} = options;

  return z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isDecimalText(value, limits),
      message,
    );
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string): boolean {
  if (!isoDatePattern.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

/** A calendar day, stored as `@db.Date` at UTC midnight. */
export function isoDateString(message: string) {
  return z
    .string()
    .trim()
    .refine((value) => isIsoDate(value), message);
}

/** An optional calendar day: an empty string means "not set". */
export function optionalIsoDateString(message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || isIsoDate(value), message);
}

// `new Date("...T24:00")` rolls over to the next day instead of failing, so
// the hour and minute ranges are checked by the pattern itself.
const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

function isIsoDateTime(value: string): boolean {
  if (!isoDateTimePattern.test(value)) return false;

  return !Number.isNaN(new Date(value).getTime());
}

/** A wall-clock datetime with no timezone suffix, `YYYY-MM-DDTHH:MM`. */
export function isoDateTimeString(message: string) {
  return z
    .string()
    .trim()
    .refine((value) => isIsoDateTime(value), message);
}
