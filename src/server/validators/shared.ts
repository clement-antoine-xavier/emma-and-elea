import {z} from "zod";

/**
 * Shared field builders for the settings forms. Values stay strings on the
 * wire so a quantity or a price never round-trips through a JavaScript number
 * before it reaches Prisma `Decimal`; the service passes them through.
 */
export function decimalString(options: {
  message: string;
  min?: number;
  max?: number;
  scale?: number;
}) {
  const {message, min = 0, max = Number.MAX_SAFE_INTEGER, scale = 4} = options;

  return z
    .string()
    .trim()
    .refine((value) => {
      if (!/^\d+(?:\.\d+)?$/.test(value)) return false;

      const fraction = value.split(".")[1]?.length ?? 0;
      const amount = Number(value);

      return (
        Number.isFinite(amount) &&
        amount >= min &&
        amount <= max &&
        fraction <= scale
      );
    }, message);
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
