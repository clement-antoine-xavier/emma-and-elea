import type {
  AssistantApprovalPreview,
  AssistantPersona,
} from "@/lib/assistant";
import type {OrganizationActor} from "@/server/auth/types";

export type AssistantConversationDto = {
  id: string;
  persona: AssistantPersona;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssistantConversationHistoryDto = {
  conversation: AssistantConversationDto;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    text: string;
    createdAt: string;
  }>;
  pendingApprovals: Array<{
    id: string;
    toolName: string;
    preview: AssistantApprovalPreview;
  }>;
};

/**
 * Read-only projection of the persisted assistant conversations. The stream
 * route stays the write path; pages use this to render history without a
 * client round-trip.
 */
export function createAssistantService() {
  return {
    async listConversations(
      actor: OrganizationActor,
      persona: AssistantPersona,
    ): Promise<AssistantConversationDto[]> {
      const {listConversations} = await import("@/server/agents/runner");
      const conversations = await listConversations(actor, persona);

      return conversations.map((conversation) => ({
        ...conversation,
        persona: conversation.persona.toLowerCase() as AssistantPersona,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      }));
    },

    async getConversation(
      actor: OrganizationActor,
      conversationId: string,
    ): Promise<AssistantConversationHistoryDto | null> {
      const {getConversationHistory} = await import("@/server/agents/runner");
      const history = await getConversationHistory(actor, conversationId);
      if (!history) return null;

      return {
        conversation: {
          ...history.conversation,
          persona: history.conversation.persona.toLowerCase() as AssistantPersona,
          createdAt: history.conversation.createdAt.toISOString(),
          updatedAt: history.conversation.updatedAt.toISOString(),
        },
        messages: history.messages,
        pendingApprovals: history.pendingApprovals.map((approval) => ({
          ...approval,
          preview: approval.preview as AssistantApprovalPreview,
        })),
      };
    },
  };
}
