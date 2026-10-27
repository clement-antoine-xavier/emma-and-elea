import {z} from "zod";
import {
  decimalString,
  optionalDecimalString,
} from "./shared";

export const ITEM_TYPES = [
  "RAW_MATERIAL",
  "PACKAGING",
  "SEMI_FINISHED",
  "FINISHED_PRODUCT",
] as const;

export const SALES_CHANNELS = ["RETAIL", "WHOLESALE", "BOTH", "NONE"] as const;

export const ALLERGEN_PRESENCES = ["CONTAINS", "MAY_CONTAIN"] as const;

export const catalogValidationKeys = [
  "nameRequired",
  "nameTooLong",
  "codeInvalid",
  "descriptionTooLong",
  "typeInvalid",
  "categoryInvalid",
  "stockUnitRequired",
  "salePriceInvalid",
  "vatInvalid",
  "shelfLifeInvalid",
  "quantityInvalid",
  "channelInvalid",
  "categoryNameRequired",
  "categoryNameTooLong",
  "parentInvalid",
  "sortOrderInvalid",
  "allergenInvalid",
  "presenceInvalid",
  "noteTooLong",
] as const;

export type CatalogValidationKey = (typeof catalogValidationKeys)[number];

export type TranslateCatalogValidation = (
  key: CatalogValidationKey,
) => string;

const optionalInteger = (
  message: string,
  min: number,
  max: number,
) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) &&
          Number(value) >= min &&
          Number(value) <= max),
      message,
    );

/**
 * All fields stay strings (or booleans) so React Hook Form and the Server
 * Action share one shape; the action converts to column types.
 */
export function itemInputSchema(t: TranslateCatalogValidation) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, t("nameRequired"))
      .max(120, t("nameTooLong")),
    code: z
      .string()
      .trim()
      .refine(
        (value) => /^[A-Za-z0-9][A-Za-z0-9-]{1,31}$/.test(value),
        t("codeInvalid"),
      ),
    description: z.string().trim().max(500, t("descriptionTooLong")),
    type: z
      .string()
      .refine(
        (value) => (ITEM_TYPES as readonly string[]).includes(value),
        t("typeInvalid"),
      ),
    categoryId: z.string().trim(),
    stockUnitId: z.string().trim().min(1, t("stockUnitRequired")),
    saleUnitId: z.string().trim(),
    salePrice: optionalDecimalString({
      message: t("salePriceInvalid"),
      min: 0,
      max: 100000,
      scale: 4,
    }),
    vatRate: decimalString({
      message: t("vatInvalid"),
      min: 0,
      max: 100,
      scale: 2,
    }),
    shelfLifeDays: optionalInteger(t("shelfLifeInvalid"), 0, 3650),
    minStockQuantity: optionalDecimalString({
      message: t("quantityInvalid"),
      min: 0,
      scale: 4,
    }),
    parLevelQuantity: optionalDecimalString({
      message: t("quantityInvalid"),
      min: 0,
      scale: 4,
    }),
    defaultChannel: z
      .string()
      .refine(
        (value) => (SALES_CHANNELS as readonly string[]).includes(value),
        t("channelInvalid"),
      ),
    isPurchasable: z.boolean(),
    isProduced: z.boolean(),
    isSellable: z.boolean(),
  });
}

export type ItemInputValues = z.infer<ReturnType<typeof itemInputSchema>>;

export function categoryInputSchema(t: TranslateCatalogValidation) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, t("categoryNameRequired"))
      .max(60, t("categoryNameTooLong")),
    parentId: z.string().trim(),
    sortOrder: z
      .string()
      .trim()
      .refine(
        (value) => /^\d+$/.test(value) && Number(value) <= 9999,
        t("sortOrderInvalid"),
      ),
  });
}

export type CategoryInputValues = z.infer<
  ReturnType<typeof categoryInputSchema>
>;

export function itemAllergenSchema(t: TranslateCatalogValidation) {
  return z.object({
    itemId: z.string().trim().min(1),
    allergenId: z.string().trim().min(1, t("allergenInvalid")),
    presence: z
      .string()
      .refine(
        (value) => (ALLERGEN_PRESENCES as readonly string[]).includes(value),
        t("presenceInvalid"),
      ),
    note: z.string().trim().max(200, t("noteTooLong")),
  });
}

export type ItemAllergenValues = z.infer<
  ReturnType<typeof itemAllergenSchema>
>;

export const itemIdSchema = z.object({id: z.string().trim().min(1)});
export const categoryIdSchema = z.object({id: z.string().trim().min(1)});
export const itemAllergenIdSchema = z.object({
  id: z.string().trim().min(1),
});
