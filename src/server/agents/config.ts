/**
 * Server-only configuration for the in-app assistants (ADR-0023).
 *
 * Secrets live in `.env` / the deployment secret manager. `.env.example`
 * documents the keys with placeholders only. Nothing here is exported to a
 * Client Component and no value is ever logged.
 */

export type AssistantConfig = {
  enabled: boolean;
  apiKey: string;
  baseUrl: string | null;
  useResponses: boolean;
  model: string;
  emmaModel: string;
  eleaModel: string;
  maxTurns: number;
  dailyTokenBudget: number;
  retentionDays: number;
  tracingDisabled: boolean;
};

function integer(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Returns the configuration, or `null` when the assistant is disabled. If the
 * flag is on but the key is missing, throws: a half-configured assistant must
 * fail closed instead of calling a provider with an empty key.
 */
export function getAssistantConfig(): AssistantConfig | null {
  const enabled = process.env.ASSISTANT_ENABLED === "true";
  if (!enabled) return null;

  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new Error(
      "ASSISTANT_ENABLED is true but OPENAI_API_KEY is missing. Set it in .env or disable the assistant.",
    );
  }

  const model = process.env.ASSISTANT_MODEL?.trim() || "gpt-5.4";
  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || null;
  const useResponses =
    process.env.ASSISTANT_USE_RESPONSES === "true"
      ? true
      : process.env.ASSISTANT_USE_RESPONSES === "false"
        ? false
        : baseUrl === null;

  return {
    enabled: true,
    apiKey,
    baseUrl,
    useResponses,
    model,
    emmaModel: process.env.ASSISTANT_EMMA_MODEL?.trim() || model,
    eleaModel: process.env.ASSISTANT_ELEA_MODEL?.trim() || model,
    maxTurns: integer(process.env.ASSISTANT_MAX_TURNS, 8),
    dailyTokenBudget: integer(process.env.ASSISTANT_DAILY_TOKEN_BUDGET, 50_000),
    retentionDays: integer(process.env.ASSISTANT_RETENTION_DAYS, 30),
    tracingDisabled: process.env.OPENAI_AGENTS_TRACING_DISABLED === "1",
  };
}

/** Whether the assistant can be rendered and called in this process. */
export function isAssistantEnabled(): boolean {
  try {
    return getAssistantConfig() !== null;
  } catch {
    return false;
  }
}
