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

/** A calendar day, stored as `@db.Date` at UTC midnight. */
export function isoDateString(message: string) {
  return z
    .string()
    .trim()
    .refine((value) => {
      if (!isoDatePattern.test(value)) return false;

      const date = new Date(`${value}T00:00:00.000Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, message);
}
