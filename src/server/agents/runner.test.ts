/**
 * @jest-environment node
 */
import {streamAssistantResponse} from "./runner";
import {agentRepository} from "@/server/repositories/agent.repository";
import {actorFor} from "@/test-utils/actor";

jest.mock("@/server/services/container", () => new Proxy({}, {
  get: () => ({}),
}));

jest.mock("@/server/repositories/agent.repository", () => ({
  agentRepository: {
    countRunsForUserSince: jest.fn(),
    findConversation: jest.fn(),
    touchConversation: jest.fn(),
    createConversation: jest.fn(),
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
    finishApproval: jest.fn(),
    decideApproval: jest.fn(),
    getMessages: jest.fn(),
    listConversations: jest.fn(),
  },
}));

const repository = agentRepository as jest.Mocked<typeof agentRepository>;
const original = {...process.env};

beforeEach(() => {
  process.env = {
    ...original,
    NODE_ENV: "test",
    ASSISTANT_ENABLED: "true",
    ASSISTANT_FAKE_MODEL: "echo",
    ASSISTANT_MODEL: "openai/test-model",
    TOOL_APPROVAL_SECRET: "test-secret",
  };
  jest.clearAllMocks();

  repository.countRunsForUserSince.mockResolvedValue(0);
  repository.findConversation.mockResolvedValue({
    id: "conv_1",
    persona: "EMMA",
    title: "Hello",
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

test("streams a deterministic reply and persists the UI messages", async () => {
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
          parts: [{type: "text", text: "Hello"}],
        },
      ],
    },
  });

  const body = await response.text();

  expect(body).toContain("Test reply from the assistant.");
  expect(repository.replaceMessages).toHaveBeenCalledWith(
    "conv_1",
    expect.arrayContaining([
      expect.objectContaining({id: "msg_1", role: "user"}),
    ]),
  );
  expect(repository.updateRun).toHaveBeenCalledWith(
    "run_1",
    expect.objectContaining({status: "COMPLETED"}),
  );
});
