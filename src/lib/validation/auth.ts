import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .pipe(z.email("Enter a valid email address."));

const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your name.")
  .max(80, "Name is too long.");

const signInPasswordSchema = z.string().min(1, "Enter your password.");

const signUpPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Password is too long.");

export function createAuthSchema(mode: "sign-in" | "sign-up") {
  return z.object({
    name: mode === "sign-up" ? nameSchema : z.string().optional(),
    email: emailSchema,
    password:
      mode === "sign-up" ? signUpPasswordSchema : signInPasswordSchema,
  });
}

export const signInSchema = createAuthSchema("sign-in");
export const signUpSchema = createAuthSchema("sign-up");

export type AuthFormValues = z.infer<ReturnType<typeof createAuthSchema>>;
export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
