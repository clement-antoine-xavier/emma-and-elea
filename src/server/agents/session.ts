import type {AgentInputItem, Session} from "@openai/agents";
import {agentRepository} from "@/server/repositories/agent.repository";

/**
 * SDK session backed by `agent_message`. Every SDK item (user text, assistant
 * message, function call, function output) is stored as JSON so a conversation
 * can be replayed after a reload.
 */
export class PrismaAgentSession implements Session {
  constructor(private readonly conversationId: string) {}

  async getSessionId(): Promise<string> {
    return this.conversationId;
  }

  async getItems(limit?: number): Promise<AgentInputItem[]> {
    const rows = await agentRepository.getMessages(
      this.conversationId,
      limit,
    );

    return rows.map((row) => row.item as AgentInputItem);
  }

  async addItems(items: AgentInputItem[]): Promise<void> {
    await agentRepository.appendMessages(this.conversationId, items);
  }

  async popItem(): Promise<AgentInputItem | undefined> {
    return (await agentRepository.popMessage(
      this.conversationId,
    )) as AgentInputItem | undefined;
  }

  async clearSession(): Promise<void> {
    await agentRepository.clearMessages(this.conversationId);
  }
}
