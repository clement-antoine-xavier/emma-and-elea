import { createAuthSchema } from "./auth";
import en from "../../../messages/en.json";

const t = (key: keyof typeof en.Auth.validation) => en.Auth.validation[key];

describe("auth schemas", () => {
  it("reports sign-up field errors", () => {
    const result = createAuthSchema("sign-up", t).safeParse({
      name: "",
      email: "not-an-email",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Enter your name.",
        "Enter a valid email address.",
        "Use at least 8 characters.",
      ]),
    );
  });

  it("trims valid sign-up values", () => {
    const result = createAuthSchema("sign-up", t).safeParse({
      name: "  Ada  ",
      email: "  ada@example.com ",
      password: "password123",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toEqual({
      name: "Ada",
      email: "ada@example.com",
      password: "password123",
    });
  });

  it("does not require a name on sign-in", () => {
    const result = createAuthSchema("sign-in", t).safeParse({
      name: "",
      email: "ada@example.com",
      password: "x",
    });

    expect(result.success).toBe(true);
  });

  it("uses the provided translations for field errors", () => {
    const result = createAuthSchema("sign-up", (key) => `translated:${key}`).safeParse({
      name: "",
      email: "not-an-email",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "translated:nameRequired",
        "translated:emailInvalid",
        "translated:passwordTooShort",
      ]),
    );
  });
});
