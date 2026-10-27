import {z} from "zod";
import {decimalString, optionalIsoDateString} from "./shared";

export const productionValidationKeys = [
  "siteRequired",
  "recipeRequired",
  "quantityInvalid",
  "dateInvalid",
  "noteTooLong",
  "lotRequired",
  "reasonRequired",
  "itemRequired",
] as const;

export type ProductionValidationKey =
  (typeof productionValidationKeys)[number];

export type TranslateProductionValidation = (
  key: ProductionValidationKey,
) => string;

export function productionBatchSchema(t: TranslateProductionValidation) {
  return z.object({
    siteId: z.string().trim().min(1, t("siteRequired")),
    recipeVersionId: z.string().trim().min(1, t("recipeRequired")),
    plannedQuantity: decimalString({
      message: t("quantityInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }).refine((value) => Number(value) > 0, t("quantityInvalid")),
    plannedStartAt: optionalIsoDateString(t("dateInvalid")),
    note: z.string().trim().max(300, t("noteTooLong")),
  });
}

export type ProductionBatchValues = z.infer<
  ReturnType<typeof productionBatchSchema>
>;

export function completeBatchSchema(t: TranslateProductionValidation) {
  return z.object({
    actualQuantity: decimalString({
      message: t("quantityInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }).refine((value) => Number(value) > 0, t("quantityInvalid")),
    producedOn: optionalIsoDateString(t("dateInvalid")),
  });
}

export type CompleteBatchValues = z.infer<
  ReturnType<typeof completeBatchSchema>
>;

export function wasteSchema(t: TranslateProductionValidation) {
  return z.object({
    lotId: z.string().trim().min(1, t("lotRequired")),
    lossReasonId: z.string().trim().min(1, t("reasonRequired")),
    quantity: decimalString({
      message: t("quantityInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }).refine((value) => Number(value) > 0, t("quantityInvalid")),
    reason: z.string().trim().max(300, t("noteTooLong")),
    recordedAt: optionalIsoDateString(t("dateInvalid")),
  });
}

export type WasteValues = z.infer<ReturnType<typeof wasteSchema>>;

export const productionBatchIdSchema = z.object({
  id: z.string().trim().min(1),
});
export const wasteIdSchema = z.object({id: z.string().trim().min(1)});
