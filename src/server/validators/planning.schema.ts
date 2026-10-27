import {z} from "zod";
import {decimalString, isoDateString} from "./shared";

export const planningValidationKeys = [
  "siteRequired",
  "dateInvalid",
  "noteTooLong",
  "itemRequired",
  "quantityInvalid",
  "lineRequired",
] as const;

export type PlanningValidationKey = (typeof planningValidationKeys)[number];

export type TranslatePlanningValidation = (
  key: PlanningValidationKey,
) => string;

export function planInputSchema(t: TranslatePlanningValidation) {
  return z.object({
    siteId: z.string().trim().min(1, t("siteRequired")),
    plannedFor: isoDateString(t("dateInvalid")),
    includeForecast: z.boolean(),
    includeOrders: z.boolean(),
    note: z.string().trim().max(300, t("noteTooLong")),
  });
}

export type PlanInputValues = z.infer<ReturnType<typeof planInputSchema>>;

export function planLineInputSchema(t: TranslatePlanningValidation) {
  return z.object({
    itemId: z.string().trim().min(1, t("itemRequired")),
    quantity: decimalString({
      message: t("quantityInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }).refine((value) => Number(value) > 0, t("quantityInvalid")),
    note: z.string().trim().max(200, t("noteTooLong")),
  });
}

export type PlanLineInputValues = z.infer<
  ReturnType<typeof planLineInputSchema>
>;

export function planLineUpdateSchema(t: TranslatePlanningValidation) {
  return z.object({
    lineId: z.string().trim().min(1, t("lineRequired")),
    quantity: decimalString({
      message: t("quantityInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }).refine((value) => Number(value) > 0, t("quantityInvalid")),
  });
}

export type PlanLineUpdateValues = z.infer<
  ReturnType<typeof planLineUpdateSchema>
>;

export const planIdSchema = z.object({id: z.string().trim().min(1)});
export const planLineIdSchema = z.object({
  planId: z.string().trim().min(1),
  lineId: z.string().trim().min(1),
});
export const planLineBatchSchema = z.object({
  lineId: z.string().trim().min(1),
});
