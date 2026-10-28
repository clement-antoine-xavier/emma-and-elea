import {
  getConversationHistory,
  listConversations,
} from "@/server/agents/runner";
import {createAssistantService} from "./assistant.service";
import type {OrganizationActor} from "@/server/auth/types";

jest.mock("@/server/agents/runner", () => ({
  getConversationHistory: jest.fn(),
  listConversations: jest.fn(),
}));

const actor = {} as OrganizationActor;
const service = createAssistantService();
const listMock = listConversations as jest.MockedFunction<
  typeof listConversations
>;
const historyMock = getConversationHistory as jest.MockedFunction<
  typeof getConversationHistory
>;

test("maps conversation rows to serializable DTOs", async () => {
  listMock.mockResolvedValue([
    {
      id: "conv_1",
      persona: "ELEA",
      title: "Stock check",
      createdAt: new Date("2026-10-01T08:00:00.000Z"),
      updatedAt: new Date("2026-10-02T09:30:00.000Z"),
    },
  ]);

  await expect(service.listConversations(actor, "elea")).resolves.toEqual([
    {
      id: "conv_1",
      persona: "elea",
      title: "Stock check",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-02T09:30:00.000Z",
    },
  ]);
});

test("returns null when the conversation is not visible to the actor", async () => {
  historyMock.mockResolvedValue(null);

  await expect(service.getConversation(actor, "missing")).resolves.toBeNull();
});

test("maps the stored history and keeps the approval preview", async () => {
  const preview = {
    title: "Confirm order",
    summary: "Post the draft order.",
    facts: [{label: "Customer", value: "Maison Lefèvre"}],
  };

  historyMock.mockResolvedValue({
    conversation: {
      id: "conv_1",
      persona: "EMMA",
      title: null,
      createdAt: new Date("2026-10-01T08:00:00.000Z"),
      updatedAt: new Date("2026-10-01T08:05:00.000Z"),
    },
    messages: [
      {
        id: "msg_1",
        role: "user",
        text: "Confirm the order",
        createdAt: "2026-10-01T08:00:01.000Z",
      },
    ],
    pendingApprovals: [
      {id: "approval_1", toolName: "confirm_order", preview},
    ],
  });

  await expect(service.getConversation(actor, "conv_1")).resolves.toEqual({
    conversation: {
      id: "conv_1",
      persona: "emma",
      title: null,
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:05:00.000Z",
    },
    messages: [
      {
        id: "msg_1",
        role: "user",
        text: "Confirm the order",
        createdAt: "2026-10-01T08:00:01.000Z",
      },
    ],
    pendingApprovals: [
      {id: "approval_1", toolName: "confirm_order", preview},
    ],
  });
});
