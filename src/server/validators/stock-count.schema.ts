import {z} from "zod";
import {decimalString, isoDateString} from "./shared";

export const stockCountValidationKeys = [
  "siteRequired",
  "dateInvalid",
  "noteTooLong",
  "quantityInvalid",
  "linesRequired",
] as const;

export type StockCountValidationKey =
  (typeof stockCountValidationKeys)[number];

export type TranslateStockCountValidation = (
  key: StockCountValidationKey,
) => string;

export function stockCountInputSchema(t: TranslateStockCountValidation) {
  return z.object({
    siteId: z.string().trim().min(1, t("siteRequired")),
    countedAt: isoDateString(t("dateInvalid")),
    note: z.string().trim().max(300, t("noteTooLong")),
  });
}

export type StockCountInputValues = z.infer<
  ReturnType<typeof stockCountInputSchema>
>;

export function stockCountLinesSchema(t: TranslateStockCountValidation) {
  return z.object({
    lines: z
      .array(
        z.object({
          id: z.string().trim().min(1, t("linesRequired")),
          countedQuantity: decimalString({
            message: t("quantityInvalid"),
            min: 0,
            max: 1000000,
            scale: 4,
          }),
        }),
      )
      .min(1, t("linesRequired")),
  });
}

export type StockCountLinesValues = z.infer<
  ReturnType<typeof stockCountLinesSchema>
>;

export const stockCountIdSchema = z.object({id: z.string().trim().min(1)});
