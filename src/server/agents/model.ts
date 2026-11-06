import {
  createGateway,
  gateway,
  simulateReadableStream,
  type LanguageModel,
} from "ai";
import {MockLanguageModelV4} from "ai/test";
import type {AssistantConfig} from "./config";
import type {AssistantPersona} from "./context";

const usage = {
  inputTokens: {
    total: 3,
    noCache: 3,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {
    total: 12,
    text: 12,
    reasoning: undefined,
  },
};

/**
 * Deterministic model used by the E2E smoke test and component tests when no
 * Gateway credential is available. It never runs in a production build.
 */
function fakeModel(): LanguageModel {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          {type: "text-start", id: "text-1"},
          {
            type: "text-delta",
            id: "text-1",
            delta: "Test reply from the assistant. Ask me about today's priorities.",
          },
          {type: "text-end", id: "text-1"},
          {
            type: "finish",
            finishReason: {unified: "stop", raw: undefined},
            logprobs: undefined,
            usage,
          },
        ],
      }),
    }),
  });
}

let provider: ReturnType<typeof createGateway> | null = null;
let providerKey: string | null = null;

function gatewayProvider(
  config: AssistantConfig,
): ReturnType<typeof createGateway> | null {
  if (!config.gatewayApiKey) return null;

  if (provider && providerKey === config.gatewayApiKey) return provider;

  provider = createGateway({apiKey: config.gatewayApiKey});
  providerKey = config.gatewayApiKey;

  return provider;
}

export function modelFor(
  persona: AssistantPersona,
  config: Pick<AssistantConfig, "emmaModel" | "eleaModel">,
): string {
  return persona === "emma" ? config.emmaModel : config.eleaModel;
}

/**
 * Resolves the Gateway model for a persona. On Vercel the Gateway provider
 * authenticates with OIDC; elsewhere `AI_GATEWAY_API_KEY` is required unless the
 * deterministic test model is enabled.
 */
export function resolveModel(
  persona: AssistantPersona,
  config: AssistantConfig,
): LanguageModel {
  if (config.fakeModel) return fakeModel();

  const model = modelFor(persona, config);
  const customProvider = gatewayProvider(config);

  return customProvider ? customProvider(model) : gateway(model);
}

export function resetModelProviderForTests(): void {
  provider = null;
  providerKey = null;
}
