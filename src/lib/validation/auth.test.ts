import { createAuthSchema } from "./auth";

describe("auth schemas", () => {
  it("reports sign-up field errors", () => {
    const result = createAuthSchema("sign-up").safeParse({
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
    const result = createAuthSchema("sign-up").safeParse({
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
    const result = createAuthSchema("sign-in").safeParse({
      name: "",
      email: "ada@example.com",
      password: "x",
    });

    expect(result.success).toBe(true);
  });
});
