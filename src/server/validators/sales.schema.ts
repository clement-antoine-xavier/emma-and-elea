import {z} from "zod";
import {decimalString, isoDateString} from "./shared";

export const SALES_CHANNELS = ["RETAIL", "WHOLESALE", "BOTH", "NONE"] as const;

export const salesValidationKeys = [
  "customerRequired",
  "siteRequired",
  "dateInvalid",
  "noteTooLong",
  "itemRequired",
  "quantityInvalid",
  "unitRequired",
  "priceInvalid",
  "lotRequired",
  "channelInvalid",
  "revenueInvalid",
] as const;

export type SalesValidationKey = (typeof salesValidationKeys)[number];

export type TranslateSalesValidation = (key: SalesValidationKey) => string;

export function orderInputSchema(t: TranslateSalesValidation) {
  return z.object({
    customerId: z.string().trim().min(1, t("customerRequired")),
    siteId: z.string().trim().min(1, t("siteRequired")),
    requestedFor: isoDateString(t("dateInvalid")),
    note: z.string().trim().max(300, t("noteTooLong")),
  });
}

export type OrderInputValues = z.infer<ReturnType<typeof orderInputSchema>>;

export function orderLineInputSchema(t: TranslateSalesValidation) {
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
      message: t("priceInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }),
    note: z.string().trim().max(200, t("noteTooLong")),
  });
}

export type OrderLineInputValues = z.infer<
  ReturnType<typeof orderLineInputSchema>
>;

export function dispatchInputSchema(t: TranslateSalesValidation) {
  return z.object({
    siteId: z.string().trim().min(1, t("siteRequired")),
    customerId: z.string().trim(),
    orderId: z.string().trim(),
    carrier: z.string().trim().max(80, t("noteTooLong")),
    note: z.string().trim().max(300, t("noteTooLong")),
  });
}

export type DispatchInputValues = z.infer<
  ReturnType<typeof dispatchInputSchema>
>;

export function dispatchLineInputSchema(t: TranslateSalesValidation) {
  return z.object({
    lotId: z.string().trim().min(1, t("lotRequired")),
    quantity: decimalString({
      message: t("quantityInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }).refine((value) => Number(value) > 0, t("quantityInvalid")),
    unitPrice: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || Number.isFinite(Number(value)) && Number(value) >= 0,
        t("priceInvalid"),
      ),
    note: z.string().trim().max(200, t("noteTooLong")),
  });
}

export type DispatchLineInputValues = z.infer<
  ReturnType<typeof dispatchLineInputSchema>
>;

export function dailySalesInputSchema(t: TranslateSalesValidation) {
  return z.object({
    siteId: z.string().trim().min(1, t("siteRequired")),
    itemId: z.string().trim().min(1, t("itemRequired")),
    businessDate: isoDateString(t("dateInvalid")),
    channel: z
      .string()
      .refine(
        (value) => (SALES_CHANNELS as readonly string[]).includes(value),
        t("channelInvalid"),
      ),
    quantitySold: decimalString({
      message: t("quantityInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }).refine((value) => Number(value) > 0, t("quantityInvalid")),
    revenue: decimalString({
      message: t("revenueInvalid"),
      min: 0,
      max: 10000000,
      scale: 4,
    }),
    note: z.string().trim().max(300, t("noteTooLong")),
  });
}

export type DailySalesInputValues = z.infer<
  ReturnType<typeof dailySalesInputSchema>
>;

export const orderIdSchema = z.object({id: z.string().trim().min(1)});
export const dispatchIdSchema = z.object({id: z.string().trim().min(1)});
export const orderLineIdSchema = z.object({
  orderId: z.string().trim().min(1),
  lineId: z.string().trim().min(1),
});
export const dispatchLineIdSchema = z.object({
  dispatchId: z.string().trim().min(1),
  lineId: z.string().trim().min(1),
});
