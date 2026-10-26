import {z} from "zod";
import {ORG_ROLES} from "@/lib/permissions";

export const organizationNameValidationKeys = [
  "nameRequired",
  "nameTooLong",
  "slugInvalid",
  "slugTooLong",
] as const;

export const memberValidationKeys = ["emailInvalid", "roleInvalid"] as const;

export type OrganizationNameValidationKey =
  (typeof organizationNameValidationKeys)[number];

export type MemberValidationKey = (typeof memberValidationKeys)[number];

export type TranslateOrganizationNameValidation = (
  key: OrganizationNameValidationKey,
) => string;

export type TranslateMemberValidation = (key: MemberValidationKey) => string;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyOrganizationName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

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

export function inviteMemberSchema(t: TranslateMemberValidation) {
  return z.object({
    email: z.string().trim().pipe(z.email(t("emailInvalid"))),
    role: z
      .string()
      .refine(
        (value) => (ORG_ROLES as readonly string[]).includes(value),
        t("roleInvalid"),
      ),
  });
}

export type InviteMemberValues = z.infer<
  ReturnType<typeof inviteMemberSchema>
>;
