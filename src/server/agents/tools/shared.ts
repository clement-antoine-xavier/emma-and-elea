import {tool, type ToolSet} from "ai";
import type {z} from "zod";
import {isDomainError} from "@/server/domain/errors";
import type {AssistantContext} from "../context";

/**
 * A service call exposed to the model. The definition is independent of the
 * AI SDK so the catalogue stays pure and easy to test; `buildToolSet` adapts it
 * to the SDK with the current request context.
 */
export type AssistantTool = {
  name: string;
  description: string;
  parameters: z.ZodTypeAny;
  needsApproval?: boolean;
  execute: (
    input: z.infer<z.ZodTypeAny>,
    context: AssistantContext,
  ) => Promise<unknown>;
};

/**
 * Declares a tool. Domain errors become a compact JSON payload the model can
 * explain; unexpected errors propagate and are surfaced as tool errors.
 */
export function assistantTool<TSchema extends z.ZodTypeAny>(options: {
  name: string;
  description: string;
  parameters: TSchema;
  needsApproval?: boolean;
  execute: (
    input: z.infer<TSchema>,
    context: AssistantContext,
  ) => Promise<unknown>;
}): AssistantTool {
  return options as AssistantTool;
}

/**
 * Binds the pure tool definitions to one actor, locale and run. The context is
 * never sent to the model or accepted from the client.
 */
export function buildToolSet(
  definitions: readonly AssistantTool[],
  context: AssistantContext,
): ToolSet {
  return Object.fromEntries(
    definitions.map((definition) => [
      definition.name,
      tool({
        description: definition.description,
        inputSchema: definition.parameters,
        execute: async (input: unknown) => {
          try {
            const value = await definition.execute(input, context);
            return value === undefined ? "Done." : JSON.stringify(value);
          } catch (error) {
            if (isDomainError(error)) {
              return JSON.stringify({
                error: {code: error.code, message: error.message},
              });
            }
            throw error;
          }
        },
      }),
    ]),
  ) as ToolSet;
}

export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

export function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}
