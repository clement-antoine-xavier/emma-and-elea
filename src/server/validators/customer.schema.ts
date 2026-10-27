import {z} from "zod";

export const CUSTOMER_TYPES = ["BUSINESS", "INDIVIDUAL"] as const;

export const customerValidationKeys = [
  "nameRequired",
  "nameTooLong",
  "codeInvalid",
  "typeInvalid",
  "emailInvalid",
  "phoneTooLong",
  "cityTooLong",
  "vatTooLong",
  "noteTooLong",
] as const;

export type CustomerValidationKey = (typeof customerValidationKeys)[number];

export type TranslateCustomerValidation = (
  key: CustomerValidationKey,
) => string;

export function customerInputSchema(t: TranslateCustomerValidation) {
  return z.object({
    code: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^[A-Za-z0-9][A-Za-z0-9-]{0,15}$/.test(value),
        t("codeInvalid"),
      ),
    name: z
      .string()
      .trim()
      .min(2, t("nameRequired"))
      .max(120, t("nameTooLong")),
    type: z
      .string()
      .refine(
        (value) => (CUSTOMER_TYPES as readonly string[]).includes(value),
        t("typeInvalid"),
      ),
    contactName: z.string().trim().max(80, t("nameTooLong")),
    email: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || z.email().safeParse(value).success,
        t("emailInvalid"),
      ),
    phone: z.string().trim().max(40, t("phoneTooLong")),
    city: z.string().trim().max(80, t("cityTooLong")),
    vatNumber: z.string().trim().max(30, t("vatTooLong")),
    note: z.string().trim().max(300, t("noteTooLong")),
  });
}

export type CustomerInputValues = z.infer<
  ReturnType<typeof customerInputSchema>
>;

export const customerIdSchema = z.object({id: z.string().trim().min(1)});
