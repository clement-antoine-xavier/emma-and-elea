import {
  OpenAIProvider,
  setDefaultModelProvider,
  setTracingDisabled,
} from "@openai/agents";
import type {AssistantConfig} from "./config";

let configuredFor: string | null = null;

/**
 * Installs the OpenAI provider once per process. The key is read from the
 * server environment and never serialized into a run or a response.
 */
export async function ensureModelProvider(
  config: AssistantConfig,
): Promise<void> {
  const fingerprint = `${config.apiKey}:${config.baseUrl ?? ""}`;
  if (configuredFor === fingerprint) return;

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ASSISTANT_FAKE_MODEL === "echo"
  ) {
    const {fakeAssistantProvider} = await import("./testing");
    setDefaultModelProvider(fakeAssistantProvider);
    setTracingDisabled(true);
    configuredFor = fingerprint;
    return;
  }

  setDefaultModelProvider(
    new OpenAIProvider({
      apiKey: config.apiKey,
      useResponses: config.useResponses,
      ...(config.baseUrl ? {baseURL: config.baseUrl} : {}),
    }),
  );
  setTracingDisabled(config.tracingDisabled);
  configuredFor = fingerprint;
}

export function resetModelProviderForTests(): void {
  configuredFor = null;
}
