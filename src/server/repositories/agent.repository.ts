import {prisma} from "@/lib/prisma";
import type {Prisma} from "@/generated/prisma/client";

/**
 * Persistence for the in-app assistants (ADR-0023). The repository stores the
 * SDK conversation items verbatim so a run can be replayed, and keeps a
 * separate approval row for every tool call that needs a human decision.
 */

export type AgentPersonaName = "EMMA" | "ELEA";

export type AgentConversationRecord = {
  id: string;
  persona: AgentPersonaName;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AgentMessageRecord = {
  seq: number;
  id: string;
  item: unknown;
  createdAt: Date;
};

export type AgentRunRecord = {
  id: string;
  conversationId: string;
  persona: AgentPersonaName;
  model: string;
  status: string;
  state: string | null;
  inputTokens: number;
  outputTokens: number;
  traceId: string | null;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AgentApprovalRecord = {
  id: string;
  runId: string;
  organizationId: string;
  userId: string;
  callId: string;
  toolName: string;
  arguments: unknown;
  preview: unknown;
  status: string;
  decidedBy: string | null;
  decidedAt: Date | null;
  expiresAt: Date;
  executedAt: Date | null;
};

const conversationSelect = {
  id: true,
  persona: true,
  title: true,
  createdAt: true,
  updatedAt: true,
} as const;

const messageSelect = {
  seq: true,
  id: true,
  item: true,
  createdAt: true,
} as const;

const runSelect = {
  id: true,
  conversationId: true,
  persona: true,
  model: true,
  status: true,
  state: true,
  inputTokens: true,
  outputTokens: true,
  traceId: true,
  errorCode: true,
  createdAt: true,
  updatedAt: true,
} as const;

const approvalSelect = {
  id: true,
  runId: true,
  organizationId: true,
  userId: true,
  callId: true,
  toolName: true,
  arguments: true,
  preview: true,
  status: true,
  decidedBy: true,
  decidedAt: true,
  expiresAt: true,
  executedAt: true,
} as const;

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const agentRepository = {
  async createConversation(input: {
    organizationId: string;
    userId: string;
    persona: AgentPersonaName;
    title: string | null;
  }): Promise<AgentConversationRecord> {
    return prisma.agentConversation.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        persona: input.persona,
        title: input.title,
      },
      select: conversationSelect,
    });
  },

  async findConversation(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<AgentConversationRecord | null> {
    return prisma.agentConversation.findFirst({
      where: {id, organizationId, userId},
      select: conversationSelect,
    });
  },

  async listConversations(
    organizationId: string,
    userId: string,
    persona: AgentPersonaName,
    take = 12,
  ): Promise<AgentConversationRecord[]> {
    return prisma.agentConversation.findMany({
      where: {organizationId, userId, persona},
      orderBy: {updatedAt: "desc"},
      take,
      select: conversationSelect,
    });
  },

  async touchConversation(
    id: string,
    title?: string | null,
  ): Promise<void> {
    await prisma.agentConversation.update({
      where: {id},
      data: {
        updatedAt: new Date(),
        ...(title !== undefined ? {title} : {}),
      },
    });
  },

  async appendMessages(
    conversationId: string,
    items: readonly unknown[],
  ): Promise<void> {
    if (items.length === 0) return;

    await prisma.agentMessage.createMany({
      data: items.map((item) => ({
        conversationId,
        item: asJson(item),
      })),
    });
  },

  async getMessages(
    conversationId: string,
    limit?: number,
  ): Promise<AgentMessageRecord[]> {
    if (limit === undefined) {
      return prisma.agentMessage.findMany({
        where: {conversationId},
        orderBy: {seq: "asc"},
        select: messageSelect,
      });
    }

    const rows = await prisma.agentMessage.findMany({
      where: {conversationId},
      orderBy: {seq: "desc"},
      take: limit,
      select: messageSelect,
    });

    return rows.reverse();
  },

  async popMessage(conversationId: string): Promise<unknown | undefined> {
    const row = await prisma.agentMessage.findFirst({
      where: {conversationId},
      orderBy: {seq: "desc"},
      select: messageSelect,
    });

    if (!row) return undefined;
    await prisma.agentMessage.delete({where: {seq: row.seq}});

    return row.item;
  },

  async clearMessages(conversationId: string): Promise<void> {
    await prisma.agentMessage.deleteMany({where: {conversationId}});
  },

  async createRun(input: {
    conversationId: string;
    persona: AgentPersonaName;
    model: string;
  }): Promise<AgentRunRecord> {
    return prisma.agentRun.create({
      data: {
        conversationId: input.conversationId,
        persona: input.persona,
        model: input.model,
        status: "RUNNING",
      },
      select: runSelect,
    });
  },

  async updateRun(
    id: string,
    data: {
      status?: string;
      state?: string | null;
      inputTokens?: number;
      outputTokens?: number;
      traceId?: string | null;
      errorCode?: string | null;
    },
  ): Promise<void> {
    await prisma.agentRun.update({where: {id}, data});
  },

  async findRun(id: string): Promise<AgentRunRecord | null> {
    return prisma.agentRun.findUnique({where: {id}, select: runSelect});
  },

  async sumTokensForUserSince(
    userId: string,
    since: Date,
  ): Promise<number> {
    const result = await prisma.agentRun.aggregate({
      where: {createdAt: {gte: since}, conversation: {userId}},
      _sum: {inputTokens: true, outputTokens: true},
    });

    return (
      (result._sum.inputTokens ?? 0) + (result._sum.outputTokens ?? 0)
    );
  },

  async countRunsForUserSince(
    userId: string,
    since: Date,
  ): Promise<number> {
    return prisma.agentRun.count({
      where: {createdAt: {gte: since}, conversation: {userId}},
    });
  },

  async createApprovals(
    input: ReadonlyArray<{
      runId: string;
      organizationId: string;
      userId: string;
      callId: string;
      toolName: string;
      arguments: unknown;
      preview: unknown;
      expiresAt: Date;
    }>,
  ): Promise<AgentApprovalRecord[]> {
    if (input.length === 0) return [];

    return prisma.$transaction(
      input.map((approval) =>
        prisma.agentApproval.create({
          data: {
            runId: approval.runId,
            organizationId: approval.organizationId,
            userId: approval.userId,
            callId: approval.callId,
            toolName: approval.toolName,
            arguments: asJson(approval.arguments),
            preview: asJson(approval.preview),
            expiresAt: approval.expiresAt,
          },
          select: approvalSelect,
        }),
      ),
    );
  },

  async findApproval(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<AgentApprovalRecord | null> {
    return prisma.agentApproval.findFirst({
      where: {id, organizationId, userId},
      select: approvalSelect,
    });
  },

  async listApprovalsForRun(
    runId: string,
  ): Promise<AgentApprovalRecord[]> {
    return prisma.agentApproval.findMany({
      where: {runId},
      orderBy: {id: "asc"},
      select: approvalSelect,
    });
  },

  async listPendingApprovalsForConversation(
    conversationId: string,
  ): Promise<AgentApprovalRecord[]> {
    return prisma.agentApproval.findMany({
      where: {status: "PENDING", run: {conversationId}},
      orderBy: {id: "asc"},
      select: approvalSelect,
    });
  },

  async decideApproval(
    id: string,
    status: "APPROVED" | "REJECTED",
    decidedBy: string,
  ): Promise<boolean> {
    const result = await prisma.agentApproval.updateMany({
      where: {id, status: "PENDING"},
      data: {status, decidedBy, decidedAt: new Date()},
    });

    return result.count === 1;
  },

  async finishApproval(
    id: string,
    status: "EXECUTED" | "FAILED",
  ): Promise<void> {
    await prisma.agentApproval.update({
      where: {id},
      data: {status, executedAt: new Date()},
    });
  },

  async expireApprovals(now: Date): Promise<void> {
    await prisma.agentApproval.updateMany({
      where: {status: "PENDING", expiresAt: {lt: now}},
      data: {status: "EXPIRED", decidedAt: now},
    });
  },
};
