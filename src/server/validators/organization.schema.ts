import {z} from "zod";

export const organizationNameValidationKeys = [
  "nameRequired",
  "nameTooLong",
  "slugInvalid",
  "slugTooLong",
] as const;

export type OrganizationNameValidationKey =
  (typeof organizationNameValidationKeys)[number];

export type TranslateOrganizationNameValidation = (
  key: OrganizationNameValidationKey,
) => string;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function createOrganizationSchema(
  t: TranslateOrganizationNameValidation,
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
  });
}

export type CreateOrganizationValues = z.infer<
  ReturnType<typeof createOrganizationSchema>
>;
