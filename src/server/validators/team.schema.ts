import {z} from "zod";
import {ORG_ROLES} from "@/lib/permissions";

export const teamValidationKeys = ["emailInvalid", "roleInvalid"] as const;

export type TeamValidationKey = (typeof teamValidationKeys)[number];

export type TranslateTeamValidation = (key: TeamValidationKey) => string;

export function inviteMemberSchema(t: TranslateTeamValidation) {
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

export function updateMemberRoleSchema(t: TranslateTeamValidation) {
  return z.object({
    memberId: z.string().trim().min(1),
    role: z
      .string()
      .refine(
        (value) => (ORG_ROLES as readonly string[]).includes(value),
        t("roleInvalid"),
      ),
  });
}

export type UpdateMemberRoleValues = z.infer<
  ReturnType<typeof updateMemberRoleSchema>
>;

export const invitationIdSchema = z.object({
  invitationId: z.string().trim().min(1),
});

export const memberIdSchema = z.object({
  memberId: z.string().trim().min(1),
});

export type InvitationIdValues = z.infer<typeof invitationIdSchema>;
