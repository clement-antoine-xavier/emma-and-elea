import type {ModelProvider} from "@openai/agents";
import {ScriptedModel, assistantMessage} from "@openai/agents/testing";

/**
 * Development-only model used by the E2E smoke test when no provider key is
 * available. It never runs in a production build.
 */
export const fakeAssistantProvider: ModelProvider = {
  getModel: () =>
    new ScriptedModel([
      [
        assistantMessage(
          "Test reply from the assistant. Ask me about today's priorities.",
        ),
      ],
    ]),
};
