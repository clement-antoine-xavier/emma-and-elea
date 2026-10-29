import {z} from "zod";
import type {SkillLevelName} from "@/lib/dto";

export const SKILL_LEVELS: readonly SkillLevelName[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
];

export const skillValidationKeys = [
  "codeInvalid",
  "nameRequired",
  "nameTooLong",
  "descriptionTooLong",
  "levelInvalid",
  "certifiedInvalid",
] as const;

export type SkillValidationKey = (typeof skillValidationKeys)[number];

export type TranslateSkillValidation = (key: SkillValidationKey) => string;

export function createSkillSchema(t: TranslateSkillValidation) {
  return z.object({
    code: z
      .string()
      .trim()
      .refine(
        (value) => /^[A-Za-z0-9][A-Za-z0-9-]{1,31}$/.test(value),
        t("codeInvalid"),
      ),
    name: z
      .string()
      .trim()
      .min(2, t("nameRequired"))
      .max(80, t("nameTooLong")),
    description: z.string().trim().max(500, t("descriptionTooLong")),
  });
}

export type CreateSkillValues = z.infer<
  ReturnType<typeof createSkillSchema>
>;

export function employeeSkillInputSchema(t: TranslateSkillValidation) {
  return z.object({
    skillId: z.string().trim().min(1, t("nameRequired")),
    level: z
      .string()
      .refine(
        (value) => (SKILL_LEVELS as readonly string[]).includes(value),
        t("levelInvalid"),
      ),
    certifiedOn: z
      .string()
      .trim()
      .refine(
        (value) =>
          value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
        t("certifiedInvalid"),
      ),
  });
}

export type EmployeeSkillInputValues = z.infer<
  ReturnType<typeof employeeSkillInputSchema>
>;

export const skillIdSchema = z.object({id: z.string().trim().min(1)});

export const employeeSkillIdSchema = z.object({
  employeeId: z.string().trim().min(1),
  id: z.string().trim().min(1),
});
