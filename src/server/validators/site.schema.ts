import {z} from "zod";

export const SITE_KINDS = ["WORKSHOP", "SHOP", "WAREHOUSE", "LAB"] as const;

export type SiteKind = (typeof SITE_KINDS)[number];

export const siteValidationKeys = [
  "nameRequired",
  "nameTooLong",
  "codeInvalid",
  "kindInvalid",
  "cityTooLong",
  "timezoneInvalid",
] as const;

export type SiteValidationKey = (typeof siteValidationKeys)[number];

export type TranslateSiteValidation = (key: SiteValidationKey) => string;

export function createSiteSchema(t: TranslateSiteValidation) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, t("nameRequired"))
      .max(80, t("nameTooLong")),
    code: z
      .string()
      .trim()
      .refine((value) => /^[A-Za-z0-9]{2,8}$/.test(value), t("codeInvalid")),
    kind: z
      .string()
      .refine(
        (value) => (SITE_KINDS as readonly string[]).includes(value),
        t("kindInvalid"),
      ),
    city: z.string().trim().max(80, t("cityTooLong")),
    timezone: z
      .string()
      .trim()
      .min(1, t("timezoneInvalid"))
      .max(60, t("timezoneInvalid"))
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", {timeZone: value});
          return true;
        } catch {
          return false;
        }
      }, t("timezoneInvalid")),
  });
}

export type CreateSiteValues = z.infer<ReturnType<typeof createSiteSchema>>;

export function updateSiteSchema(t: TranslateSiteValidation) {
  return createSiteSchema(t).extend({
    id: z.string().trim().min(1),
  });
}

export type UpdateSiteValues = z.infer<ReturnType<typeof updateSiteSchema>>;

export const siteIdSchema = z.object({
  id: z.string().trim().min(1),
});
