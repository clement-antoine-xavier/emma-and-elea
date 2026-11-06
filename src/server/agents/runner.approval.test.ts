/**
 * @jest-environment node
 */
import {streamAssistantResponse} from "./runner";
import {agentRepository} from "@/server/repositories/agent.repository";
import {actorFor} from "@/test-utils/actor";

jest.mock("@/server/services/container", () => new Proxy({}, {
  get: () => ({}),
}));

jest.mock("./model", () => {
  const {MockLanguageModelV4} = jest.requireActual("ai/test");
  const {simulateReadableStream} = jest.requireActual("ai");

  const usage = {
    inputTokens: {
      total: 3,
      noCache: 3,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: 4,
      text: 4,
      reasoning: undefined,
    },
  };

  return {
    resolveModel: () =>
      new MockLanguageModelV4({
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: [
              {type: "stream-start", warnings: []},
              {
                type: "tool-call",
                toolCallId: "call_1",
                toolName: "confirm_order",
                input: JSON.stringify({id: "order_1"}),
              },
              {
                type: "finish",
                finishReason: {unified: "tool-calls", raw: "tool_calls"},
                usage,
              },
            ],
          }),
        }),
      }),
    resetModelProviderForTests: () => undefined,
  };
});

jest.mock("@/server/repositories/agent.repository", () => ({
  agentRepository: {
    countRunsForUserSince: jest.fn(),
    findConversation: jest.fn(),
    touchConversation: jest.fn(),
    createRun: jest.fn(),
    updateRun: jest.fn(),
    replaceMessages: jest.fn(),
    listApprovalsForRun: jest.fn(),
    createApprovals: jest.fn(),
    expireApprovals: jest.fn(),
    listPendingApprovalsForConversation: jest.fn(),
    sumTokensForUserSince: jest.fn(),
    findApproval: jest.fn(),
    findRun: jest.fn(),
    decideApproval: jest.fn(),
    finishApproval: jest.fn(),
  },
}));

const repository = agentRepository as jest.Mocked<typeof agentRepository>;
const original = {...process.env};

beforeEach(() => {
  process.env = {
    ...original,
    NODE_ENV: "test",
    ASSISTANT_ENABLED: "true",
    AI_GATEWAY_API_KEY: "test-key",
    TOOL_APPROVAL_SECRET: "test-secret",
  };
  jest.clearAllMocks();

  repository.countRunsForUserSince.mockResolvedValue(0);
  repository.findConversation.mockResolvedValue({
    id: "conv_1",
    persona: "EMMA",
    title: "Confirm order",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  repository.touchConversation.mockResolvedValue(undefined);
  repository.createRun.mockResolvedValue({
    id: "run_1",
    conversationId: "conv_1",
    persona: "EMMA",
    model: "openai/test-model",
    status: "RUNNING",
    state: null,
    inputTokens: 0,
    outputTokens: 0,
    traceId: null,
    errorCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  repository.updateRun.mockResolvedValue(undefined);
  repository.replaceMessages.mockResolvedValue(undefined);
  repository.listApprovalsForRun.mockResolvedValue([]);
  repository.createApprovals.mockResolvedValue([]);
  repository.expireApprovals.mockResolvedValue(undefined);
  repository.listPendingApprovalsForConversation.mockResolvedValue([]);
  repository.sumTokensForUserSince.mockResolvedValue(0);
});

afterAll(() => {
  process.env = original;
});

test("streams an approval request and stores a pending approval", async () => {
  const response = await streamAssistantResponse({
    actor: actorFor("owner"),
    locale: "en",
    request: {
      persona: "emma",
      conversationId: "conv_1",
      messages: [
        {
          id: "msg_1",
          role: "user",
          parts: [{type: "text", text: "Confirm order order_1"}],
        },
      ],
    },
  });

  const body = await response.text();

  expect(body).toContain("tool-approval-request");
  expect(body).toContain("data-approval");
  expect(repository.createApprovals).toHaveBeenCalledWith([
    expect.objectContaining({
      callId: expect.any(String),
      toolName: "confirm_order",
      arguments: {id: "order_1"},
    }),
  ]);
  expect(repository.updateRun).toHaveBeenCalledWith(
    "run_1",
    expect.objectContaining({status: "AWAITING_APPROVAL"}),
  );
});
