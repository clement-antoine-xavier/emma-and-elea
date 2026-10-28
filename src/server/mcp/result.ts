import {isDomainError} from "@/server/domain/errors";

export type ToolTextContent = {type: "text"; text: string};

export type ToolResult = {
  content: ToolTextContent[];
  isError?: boolean;
};

/** Serializes a service DTO as JSON text, which every MCP host can render. */
export function textResult(value: unknown): ToolResult {
  const text =
    value === undefined ? "Done." : JSON.stringify(value, null, 2);

  return {content: [{type: "text", text}]};
}

export function errorResult(error: unknown): ToolResult {
  const code = isDomainError(error) ? error.code : "UNEXPECTED";
  const message =
    error instanceof Error ? error.message : "The operation failed.";

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({error: {code, message}}),
      },
    ],
    isError: true,
  };
}

/**
 * Wraps a tool body so expected domain failures become a readable tool error
 * instead of a transport-level fault. Authorization failures keep their
 * `FORBIDDEN` code so a caller can tell "not allowed" from "bad input".
 */
export async function runTool(
  action: () => Promise<unknown> | unknown,
): Promise<ToolResult> {
  try {
    return textResult(await action());
  } catch (error) {
    return errorResult(error);
  }
}
