import type {ZodType} from "zod";

/**
 * Small assertion helpers for the schema suites. They keep the cases
 * table-driven and make sure we assert the translated key, not just failure.
 */
export function expectValid<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new Error(
      `Expected valid input, got: ${result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ")}`,
    );
  }

  return result.data;
}

export function expectInvalid(
  schema: ZodType,
  input: unknown,
  message?: string,
  path?: string,
): void {
  const result = schema.safeParse(input);

  expect(result.success).toBe(false);

  if (!result.success && message) {
    const issues = result.error.issues;
    const matching = path
      ? issues.filter((issue) => issue.path.join(".") === path)
      : issues;

    expect(matching.map((issue) => issue.message)).toContain(message);
  }
}
