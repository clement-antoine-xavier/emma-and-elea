import {getAssistantConfig, isAssistantEnabled} from "./config";

const original = {...process.env};

afterEach(() => {
  process.env = {...original};
});

describe("assistant config", () => {
  it("stays disabled by default", () => {
    delete process.env.ASSISTANT_ENABLED;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.ASSISTANT_USE_RESPONSES;
    process.env.OPENAI_API_KEY = "sk-test";

    expect(getAssistantConfig()).toBeNull();
    expect(isAssistantEnabled()).toBe(false);
  });

  it("fails closed when enabled without a key", () => {
    process.env.ASSISTANT_ENABLED = "true";
    delete process.env.OPENAI_API_KEY;

    expect(() => getAssistantConfig()).toThrow(/OPENAI_API_KEY/);
    expect(isAssistantEnabled()).toBe(false);
  });

  it("reads the model and guardrails", () => {
    process.env.ASSISTANT_ENABLED = "true";
    delete process.env.OPENAI_BASE_URL;
    delete process.env.ASSISTANT_USE_RESPONSES;
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.ASSISTANT_MODEL = "test-model";
    process.env.ASSISTANT_EMMA_MODEL = "emma-model";
    process.env.ASSISTANT_MAX_TURNS = "4";
    process.env.OPENAI_AGENTS_TRACING_DISABLED = "1";

    const config = getAssistantConfig();

    expect(config).toMatchObject({
      enabled: true,
      model: "test-model",
      emmaModel: "emma-model",
      eleaModel: "test-model",
      maxTurns: 4,
      tracingDisabled: true,
      useResponses: true,
    });
    expect(isAssistantEnabled()).toBe(true);
  });

  it("defaults to Chat Completions when a custom base URL is set", () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_BASE_URL = "https://api.deepseek.com";
    delete process.env.ASSISTANT_USE_RESPONSES;

    expect(getAssistantConfig()).toMatchObject({
      baseUrl: "https://api.deepseek.com",
      useResponses: false,
    });
  });

  it("allows an explicit Responses API override", () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_BASE_URL = "https://gateway.example.com/v1";
    process.env.ASSISTANT_USE_RESPONSES = "true";

    expect(getAssistantConfig()).toMatchObject({useResponses: true});
  });
});
