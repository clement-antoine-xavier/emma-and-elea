import {getAssistantConfig, isAssistantEnabled} from "./config";

const original = {...process.env};

afterEach(() => {
  process.env = {...original};
});

describe("assistant config", () => {
  it("stays disabled by default", () => {
    delete process.env.ASSISTANT_ENABLED;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL;
    delete process.env.VERCEL_OIDC_TOKEN;

    expect(getAssistantConfig()).toBeNull();
    expect(isAssistantEnabled()).toBe(false);
  });

  it("fails closed when enabled without Gateway credentials", () => {
    process.env.ASSISTANT_ENABLED = "true";
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL;
    delete process.env.VERCEL_OIDC_TOKEN;
    process.env.ASSISTANT_FAKE_MODEL = "";

    expect(() => getAssistantConfig()).toThrow(/AI_GATEWAY_API_KEY/);
    expect(isAssistantEnabled()).toBe(false);
  });

  it("allows the fake model without a Gateway key outside production", () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.ASSISTANT_FAKE_MODEL = "echo";
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL;
    delete process.env.VERCEL_OIDC_TOKEN;

    expect(getAssistantConfig()).toMatchObject({fakeModel: true});
  });

  it("reads the Gateway model and guardrails", () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.AI_GATEWAY_API_KEY = "gateway-test";
    process.env.ASSISTANT_MODEL = "openai/test-model";
    process.env.ASSISTANT_EMMA_MODEL = "openai/emma-model";
    process.env.ASSISTANT_MAX_TURNS = "4";
    process.env.ASSISTANT_MAX_OUTPUT_TOKENS = "1024";
    process.env.ASSISTANT_MAX_RUN_TOKENS = "5000";
    process.env.ASSISTANT_TIMEOUT_MS = "240000";
    process.env.ASSISTANT_TELEMETRY_ENABLED = "true";
    process.env.TOOL_APPROVAL_SECRET = "approval-secret";

    const config = getAssistantConfig();

    expect(config).toMatchObject({
      enabled: true,
      model: "openai/test-model",
      emmaModel: "openai/emma-model",
      eleaModel: "openai/test-model",
      maxTurns: 4,
      maxOutputTokens: 1024,
      maxRunTokens: 5000,
      requestTimeoutMs: 240000,
      telemetryEnabled: true,
      toolApprovalSecret: "approval-secret",
      fakeModel: false,
    });
    expect(isAssistantEnabled()).toBe(true);
  });

  it("caps the request timeout below the route duration", () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.AI_GATEWAY_API_KEY = "gateway-test";
    process.env.ASSISTANT_TIMEOUT_MS = "999999";

    expect(getAssistantConfig()).toMatchObject({requestTimeoutMs: 290_000});
  });

  it("accepts Vercel OIDC credentials", () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.VERCEL = "1";
    delete process.env.AI_GATEWAY_API_KEY;

    expect(getAssistantConfig()).toMatchObject({enabled: true});
  });

  it("requires an approval secret in production", () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.AI_GATEWAY_API_KEY = "gateway-test";
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    delete process.env.TOOL_APPROVAL_SECRET;

    expect(() => getAssistantConfig()).toThrow(/TOOL_APPROVAL_SECRET/);
  });
});
