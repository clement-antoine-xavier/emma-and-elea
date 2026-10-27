import {z} from "zod";
import {decimalString, isoDateString} from "./shared";

export const ENERGY_KINDS = ["ELECTRICITY", "GAS"] as const;

export type EnergyKind = (typeof ENERGY_KINDS)[number];

export const rateValidationKeys = [
  "labelRequired",
  "labelTooLong",
  "costInvalid",
  "dateInvalid",
  "kindInvalid",
  "siteRequired",
] as const;

export type RateValidationKey = (typeof rateValidationKeys)[number];

export type TranslateRateValidation = (key: RateValidationKey) => string;

export function createLabourRateSchema(t: TranslateRateValidation) {
  return z.object({
    label: z
      .string()
      .trim()
      .min(2, t("labelRequired"))
      .max(60, t("labelTooLong")),
    hourlyCost: decimalString({
      message: t("costInvalid"),
      min: 0,
      max: 10000,
      scale: 4,
    }),
    siteId: z.string().trim(),
    validFrom: isoDateString(t("dateInvalid")),
  });
}

export type CreateLabourRateValues = z.infer<
  ReturnType<typeof createLabourRateSchema>
>;

export function createEnergyTariffSchema(t: TranslateRateValidation) {
  return z.object({
    siteId: z.string().trim().min(1, t("siteRequired")),
    energyKind: z
      .string()
      .refine(
        (value) => (ENERGY_KINDS as readonly string[]).includes(value),
        t("kindInvalid"),
      ),
    pricePerKwh: decimalString({
      message: t("costInvalid"),
      min: 0,
      max: 1000,
      scale: 4,
    }),
    validFrom: isoDateString(t("dateInvalid")),
  });
}

export type CreateEnergyTariffValues = z.infer<
  ReturnType<typeof createEnergyTariffSchema>
>;

export const rateIdSchema = z.object({
  id: z.string().trim().min(1),
});
