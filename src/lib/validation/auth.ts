import { z } from "zod";

export const authValidationKeys = [
  "nameRequired",
  "nameTooLong",
  "emailInvalid",
  "passwordRequired",
  "passwordTooShort",
  "passwordTooLong",
] as const;

export type AuthValidationKey = (typeof authValidationKeys)[number];

export type TranslateAuthValidation = (key: AuthValidationKey) => string;

export type AuthMode = "sign-in" | "sign-up";

export function createAuthSchema(
  mode: AuthMode,
  t: TranslateAuthValidation,
) {
  const emailSchema = z.string().trim().pipe(z.email(t("emailInvalid")));

  const nameSchema = z
    .string()
    .trim()
    .min(2, t("nameRequired"))
    .max(80, t("nameTooLong"));

  const signInPasswordSchema = z.string().min(1, t("passwordRequired"));

  const signUpPasswordSchema = z
    .string()
    .min(8, t("passwordTooShort"))
    .max(128, t("passwordTooLong"));

  return z.object({
    name: mode === "sign-up" ? nameSchema : z.string().optional(),
    email: emailSchema,
    password:
      mode === "sign-up" ? signUpPasswordSchema : signInPasswordSchema,
  });
}

export type AuthFormValues = z.infer<ReturnType<typeof createAuthSchema>>;
