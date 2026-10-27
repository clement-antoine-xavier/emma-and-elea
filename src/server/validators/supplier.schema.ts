import {z} from "zod";
import {
  decimalString,
  isoDateString,
  optionalDecimalString,
} from "./shared";

export const supplierValidationKeys = [
  "codeInvalid",
  "nameRequired",
  "nameTooLong",
  "emailInvalid",
  "phoneTooLong",
  "cityTooLong",
  "leadTimeInvalid",
  "noteTooLong",
  "itemRequired",
  "packQuantityInvalid",
  "priceInvalid",
  "dateInvalid",
  "minOrderInvalid",
  "refTooLong",
] as const;

export type SupplierValidationKey = (typeof supplierValidationKeys)[number];

export type TranslateSupplierValidation = (
  key: SupplierValidationKey,
) => string;

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message);

export function supplierInputSchema(t: TranslateSupplierValidation) {
  return z.object({
    code: z
      .string()
      .trim()
      .refine(
        (value) => /^[A-Za-z0-9][A-Za-z0-9-]{1,15}$/.test(value),
        t("codeInvalid"),
      ),
    name: z
      .string()
      .trim()
      .min(2, t("nameRequired"))
      .max(120, t("nameTooLong")),
    contactName: optionalText(80, t("nameTooLong")),
    email: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || z.email().safeParse(value).success,
        t("emailInvalid"),
      ),
    phone: optionalText(40, t("phoneTooLong")),
    city: optionalText(80, t("cityTooLong")),
    defaultLeadTimeDays: z
      .string()
      .trim()
      .refine(
        (value) =>
          value === "" ||
          (/^\d+$/.test(value) && Number(value) <= 365),
        t("leadTimeInvalid"),
      ),
    note: optionalText(300, t("noteTooLong")),
  });
}

export type SupplierInputValues = z.infer<
  ReturnType<typeof supplierInputSchema>
>;

export function supplierItemInputSchema(t: TranslateSupplierValidation) {
  return z.object({
    itemId: z.string().trim().min(1, t("itemRequired")),
    supplierRef: optionalText(60, t("refTooLong")),
    packQuantity: decimalString({
      message: t("packQuantityInvalid"),
      min: 0.0001,
      max: 100000,
      scale: 4,
    }),
    packUnitId: z.string().trim().min(1, t("itemRequired")),
    price: decimalString({
      message: t("priceInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }),
    leadTimeDays: z
      .string()
      .trim()
      .refine(
        (value) =>
          value === "" ||
          (/^\d+$/.test(value) && Number(value) <= 365),
        t("leadTimeInvalid"),
      ),
    minOrderQuantity: optionalDecimalString({
      message: t("minOrderInvalid"),
      min: 0,
      scale: 4,
    }),
    isPreferred: z.boolean(),
    validFrom: isoDateString(t("dateInvalid")),
  });
}

export type SupplierItemInputValues = z.infer<
  ReturnType<typeof supplierItemInputSchema>
>;

export const supplierIdSchema = z.object({id: z.string().trim().min(1)});
export const supplierItemIdSchema = z.object({
  id: z.string().trim().min(1),
});
