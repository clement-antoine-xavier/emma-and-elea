import {
  tool,
  type FunctionTool,
  type ToolInputParameters,
} from "@openai/agents";
import type {z} from "zod";
import {isDomainError} from "@/server/domain/errors";
import type {AssistantContext} from "../context";

export type AssistantTool = FunctionTool<
  AssistantContext,
  ToolInputParameters,
  unknown
>;

/**
 * Wraps a service call as an SDK function tool. Domain errors become a compact
 * JSON payload the model can explain; unexpected errors propagate so the route
 * can log and fail the run.
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
  return tool({
    name: options.name,
    description: options.description,
    parameters: options.parameters as never,
    needsApproval: options.needsApproval,
    execute: async (input, runContext) => {
      const context = runContext?.context;
      if (!context) throw new Error("Assistant context is missing.");

      try {
        const value = await options.execute(
          input as z.infer<TSchema>,
          context,
        );
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
  }) as AssistantTool;
}

export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

export function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}
