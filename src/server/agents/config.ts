/**
 * Server-only configuration for the in-app assistants (ADR-0030).
 *
 * Secrets live in `.env` / the deployment secret manager. `.env.example`
 * documents the keys with placeholders only. Nothing here is exported to a
 * Client Component and no value is ever logged.
 */

export type AssistantConfig = {
  enabled: boolean;
  gatewayApiKey: string | null;
  model: string;
  emmaModel: string;
  eleaModel: string;
  maxTurns: number;
  dailyTokenBudget: number;
  retentionDays: number;
  toolApprovalSecret: string | null;
  telemetryEnabled: boolean;
  fakeModel: boolean;
};

function integer(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function hasGatewayCredentials(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL === "1",
  );
}

/**
 * Returns the configuration, or `null` when the assistant is disabled. If the
 * flag is on but no Gateway credential is available, throws: a half-configured
 * assistant must fail closed instead of calling a provider without a key.
 */
export function getAssistantConfig(): AssistantConfig | null {
  const enabled = process.env.ASSISTANT_ENABLED === "true";
  if (!enabled) return null;

  const fakeModel =
    process.env.NODE_ENV !== "production" &&
    process.env.ASSISTANT_FAKE_MODEL === "echo";

  if (!fakeModel && !hasGatewayCredentials()) {
    throw new Error(
      "ASSISTANT_ENABLED is true but AI_GATEWAY_API_KEY is missing. Set it in .env, authenticate with the Vercel CLI, or disable the assistant.",
    );
  }

  const toolApprovalSecret =
    process.env.TOOL_APPROVAL_SECRET?.trim() || null;

  if (
    !fakeModel &&
    process.env.NODE_ENV === "production" &&
    !toolApprovalSecret
  ) {
    throw new Error(
      "TOOL_APPROVAL_SECRET is required in production when the assistant is enabled.",
    );
  }

  const model = process.env.ASSISTANT_MODEL?.trim() || "openai/gpt-5.4";

  return {
    enabled: true,
    gatewayApiKey: process.env.AI_GATEWAY_API_KEY?.trim() || null,
    model,
    emmaModel: process.env.ASSISTANT_EMMA_MODEL?.trim() || model,
    eleaModel: process.env.ASSISTANT_ELEA_MODEL?.trim() || model,
    maxTurns: integer(process.env.ASSISTANT_MAX_TURNS, 8),
    dailyTokenBudget: integer(process.env.ASSISTANT_DAILY_TOKEN_BUDGET, 50_000),
    retentionDays: integer(process.env.ASSISTANT_RETENTION_DAYS, 30),
    toolApprovalSecret,
    telemetryEnabled: process.env.ASSISTANT_TELEMETRY_ENABLED === "true",
    fakeModel,
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
