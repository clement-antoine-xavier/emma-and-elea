import {z} from "zod";
import {decimalString} from "./shared";

export const settingsValidationKeys = [
  "currencyInvalid",
  "overheadInvalid",
  "historyInvalid",
  "safetyInvalid",
  "shelfLifeInvalid",
  "lotPatternInvalid",
  "vatInvalid",
] as const;

export type SettingsValidationKey = (typeof settingsValidationKeys)[number];

export type TranslateSettingsValidation = (
  key: SettingsValidationKey,
) => string;

/**
 * All fields stay strings here so React Hook Form and the Server Action share
 * one shape. The action converts to the column types before calling the
 * service.
 */
export function updateOrganizationSettingsSchema(
  t: TranslateSettingsValidation,
) {
  return z.object({
    currency: z
      .string()
      .trim()
      .refine((value) => /^[A-Za-z]{3}$/.test(value), t("currencyInvalid")),
    overheadPct: decimalString({
      message: t("overheadInvalid"),
      min: 0,
      max: 100,
      scale: 2,
    }),
    forecastHistoryDays: z
      .string()
      .trim()
      .refine(
        (value) =>
          /^\d+$/.test(value) && Number(value) >= 7 && Number(value) <= 365,
        t("historyInvalid"),
      ),
    forecastSafetyPct: decimalString({
      message: t("safetyInvalid"),
      min: 0,
      max: 100,
      scale: 2,
    }),
    defaultShelfLifeDays: z
      .string()
      .trim()
      .refine(
        (value) =>
          value === "" ||
          (/^\d+$/.test(value) &&
            Number(value) >= 0 &&
            Number(value) <= 365),
        t("shelfLifeInvalid"),
      ),
    lotNumberPattern: z
      .string()
      .trim()
      .min(3, t("lotPatternInvalid"))
      .max(60, t("lotPatternInvalid")),
    pricesIncludeVat: z.enum(["true", "false"], t("vatInvalid")),
  });
}

export type UpdateOrganizationSettingsValues = z.infer<
  ReturnType<typeof updateOrganizationSettingsSchema>
>;
