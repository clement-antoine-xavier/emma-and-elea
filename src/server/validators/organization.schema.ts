import {z} from "zod";
import {SITE_CODE_PATTERN} from "@/lib/site-code";

export const organizationValidationKeys = [
  "nameRequired",
  "nameTooLong",
  "slugInvalid",
  "slugTooLong",
  "siteNameRequired",
  "siteNameTooLong",
  "siteCodeInvalid",
] as const;

export type OrganizationValidationKey =
  (typeof organizationValidationKeys)[number];

export type TranslateOrganizationValidation = (
  key: OrganizationValidationKey,
) => string;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The first site is part of onboarding because every lot, batch and tariff
 * needs a `siteId`; creating it later would leave the cockpit unusable.
 */
export function createOrganizationSchema(
  t: TranslateOrganizationValidation,
) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, t("nameRequired"))
      .max(80, t("nameTooLong")),
    slug: z
      .string()
      .trim()
      .min(2, t("slugInvalid"))
      .max(60, t("slugTooLong"))
      .regex(slugPattern, t("slugInvalid")),
    siteName: z
      .string()
      .trim()
      .min(2, t("siteNameRequired"))
      .max(80, t("siteNameTooLong")),
    siteCode: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine((value) => SITE_CODE_PATTERN.test(value), t("siteCodeInvalid")),
  });
}

export type CreateOrganizationValues = z.infer<
  ReturnType<typeof createOrganizationSchema>
>;
