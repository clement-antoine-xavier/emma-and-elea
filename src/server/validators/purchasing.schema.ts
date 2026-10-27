import {z} from "zod";
import {decimalString, optionalIsoDateString} from "./shared";

export const purchasingValidationKeys = [
  "siteRequired",
  "supplierRequired",
  "referenceTooLong",
  "noteTooLong",
  "itemRequired",
  "quantityInvalid",
  "unitRequired",
  "unitPriceInvalid",
  "dateInvalid",
  "lotTooLong",
] as const;

export type PurchasingValidationKey =
  (typeof purchasingValidationKeys)[number];

export type TranslatePurchasingValidation = (
  key: PurchasingValidationKey,
) => string;

export function receiptDraftSchema(t: TranslatePurchasingValidation) {
  return z.object({
    siteId: z.string().trim().min(1, t("siteRequired")),
    supplierId: z.string().trim().min(1, t("supplierRequired")),
    supplierReference: z
      .string()
      .trim()
      .max(60, t("referenceTooLong")),
    note: z.string().trim().max(300, t("noteTooLong")),
  });
}

export type ReceiptDraftValues = z.infer<
  ReturnType<typeof receiptDraftSchema>
>;

export function receiptLineSchema(t: TranslatePurchasingValidation) {
  return z.object({
    itemId: z.string().trim().min(1, t("itemRequired")),
    quantity: decimalString({
      message: t("quantityInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }).refine((value) => Number(value) > 0, t("quantityInvalid")),
    unitId: z.string().trim().min(1, t("unitRequired")),
    unitPrice: decimalString({
      message: t("unitPriceInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }),
    lotNumber: z.string().trim().max(60, t("lotTooLong")),
    supplierLotNumber: z.string().trim().max(60, t("lotTooLong")),
    expiresOn: optionalIsoDateString(t("dateInvalid")),
    bestBeforeOn: optionalIsoDateString(t("dateInvalid")),
  });
}

export type ReceiptLineValues = z.infer<
  ReturnType<typeof receiptLineSchema>
>;

export const receiptIdSchema = z.object({id: z.string().trim().min(1)});
export const receiptLineIdSchema = z.object({
  receiptId: z.string().trim().min(1),
  lineId: z.string().trim().min(1),
});
