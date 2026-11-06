import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type LanguageModelUsage,
  type UIMessage,
} from "ai";
import {z} from "zod";
import {
  toolLabel,
  type AssistantApprovalPreview,
  type AssistantPersona,
  type AssistantUIMessage,
} from "@/lib/assistant";
import type {Locale} from "@/i18n/routing";
import type {OrganizationActor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import {
  agentRepository,
  type AgentApprovalRecord,
  type AgentConversationRecord,
  type AgentMessageRecord,
  type AgentRunRecord,
} from "@/server/repositories/agent.repository";
import {buildApprovalPreview} from "./approvals/preview";
import {toolsFor} from "./capabilities";
import {getAssistantConfig} from "./config";
import {
  buildAssistantContext,
  personaEnum,
  type AssistantContext,
} from "./context";
import {buildPersonaAgent} from "./personas";
import {buildToolSet} from "./tools/shared";

export type AssistantMessageRequest = {
  messages: AssistantUIMessage[];
  persona: AssistantPersona;
  conversationId?: string;
};

export type AssistantHistory = {
  conversation: AgentConversationRecord;
  messages: AssistantUIMessage[];
  pendingApprovals: Array<{
    id: string;
    toolName: string;
    preview: AssistantApprovalPreview;
  }>;
};

type ApprovalRequest = {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  preview: AssistantApprovalPreview;
};

type IncomingApproval = {
  approval: AgentApprovalRecord;
  approved: boolean;
  toolCallId: string;
};

type ToolPartLike = {
  type: string;
  state?: string;
  toolCallId?: string;
  input?: unknown;
  approval?: {
    id?: string;
    approved?: boolean;
  };
};

const approvalPreviewSchema = z.object({
  title: z.string(),
  summary: z.string(),
  facts: z.array(z.object({label: z.string(), value: z.string()})),
  warning: z.string().optional(),
  href: z.string().optional(),
});

const assistantMetadataSchema = z
  .object({createdAt: z.string().optional()})
  .optional();

const assistantDataSchemas = {
  approval: approvalPreviewSchema,
  conversation: z.object({conversationId: z.string()}),
};

function isToolPart(part: unknown): part is ToolPartLike {
  return (
    typeof part === "object" &&
    part !== null &&
    typeof (part as {type?: unknown}).type === "string" &&
    (part as {type: string}).type.startsWith("tool-")
  );
}

function textFromParts(parts: readonly unknown[]): string {
  return parts
    .map((part) => {
      if (
        typeof part === "object" &&
        part !== null &&
        (part as {type?: unknown}).type === "text" &&
        typeof (part as {text?: unknown}).text === "string"
      ) {
        return (part as {text: string}).text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function legacyText(item: unknown): string {
  if (typeof item !== "object" || item === null) return "";
  const record = item as {content?: unknown};
  if (typeof record.content === "string") return record.content;
  if (!Array.isArray(record.content)) return "";

  return record.content
    .map((part) => {
      if (typeof part === "string") return part;
      if (
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof (part as {text?: unknown}).text === "string"
      ) {
        return (part as {text: string}).text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Older conversations were persisted as Agents SDK items. Convert their text
 * on read so they still render after the AI SDK migration; old tool items are
 * dropped because their protocol is no longer replayable.
 */
function normalizeStoredMessage(
  row: AgentMessageRecord,
): AssistantUIMessage | null {
  const item = row.item;

  if (typeof item === "object" && item !== null) {
    const record = item as {
      id?: unknown;
      role?: unknown;
      parts?: unknown;
    };
    if (
      typeof record.role === "string" &&
      ["user", "assistant", "system"].includes(record.role) &&
      Array.isArray(record.parts)
    ) {
      return {
        id: typeof record.id === "string" ? record.id : row.id,
        role: record.role as "user" | "assistant" | "system",
        parts: record.parts as AssistantUIMessage["parts"],
      };
    }

    const legacyRole =
      typeof record.role === "string" &&
      ["user", "assistant", "system"].includes(record.role)
        ? (record.role as "user" | "assistant" | "system")
        : null;
    const text = legacyText(item);

    if (legacyRole && text) {
      return {
        id: row.id,
        role: legacyRole,
        parts: [{type: "text", text}],
      };
    }
  }

  return null;
}

function lastUserText(messages: readonly AssistantUIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;

    return textFromParts(message.parts).trim();
  }

  return "";
}

function inputObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function previewFallback(
  toolName: string,
  input: Record<string, unknown>,
  context: AssistantContext,
): AssistantApprovalPreview {
  return {
    title: toolLabel(toolName, context.locale),
    summary:
      context.locale === "fr"
        ? "L’assistant souhaite exécuter cette action."
        : "The assistant wants to run this action.",
    facts: Object.entries(input)
      .filter(
        ([, value]) => value !== null && value !== undefined && value !== "",
      )
      .slice(0, 8)
      .map(([label, value]) => ({
        label,
        value: typeof value === "string" ? value : JSON.stringify(value),
      })),
  };
}

async function loadConversation(
  actor: OrganizationActor,
  persona: AssistantPersona,
  conversationId: string | undefined,
  firstText: string,
): Promise<AgentConversationRecord> {
  if (conversationId) {
    const conversation = await agentRepository.findConversation(
      actor.organizationId,
      actor.userId,
      conversationId,
    );
    if (!conversation || conversation.persona !== personaEnum(persona)) {
      throw new DomainError("NOT_FOUND", "CONVERSATION_NOT_FOUND");
    }
    await agentRepository.touchConversation(conversation.id);
    return conversation;
  }

  if (!firstText.trim()) {
    throw new DomainError("INVALID_INPUT", "MESSAGE_REQUIRED");
  }

  return agentRepository.createConversation({
    organizationId: actor.organizationId,
    userId: actor.userId,
    persona: personaEnum(persona),
    title: firstText.trim().slice(0, 80) || null,
  });
}

function incomingApprovalParts(
  messages: readonly AssistantUIMessage[],
): Array<{approvalId: string; approved: boolean; toolCallId: string}> {
  const seen = new Set<string>();
  const result: Array<{
    approvalId: string;
    approved: boolean;
    toolCallId: string;
  }> = [];

  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolPart(part) || part.state !== "approval-responded") continue;
      const approvalId = part.approval?.id;
      const toolCallId = part.toolCallId;
      if (!approvalId || !toolCallId || seen.has(approvalId)) continue;

      seen.add(approvalId);
      result.push({
        approvalId,
        approved: part.approval?.approved === true,
        toolCallId,
      });
    }
  }

  return result;
}

async function applyIncomingApprovals(
  actor: OrganizationActor,
  conversation: AgentConversationRecord,
  parts: Array<{approvalId: string; approved: boolean; toolCallId: string}>,
): Promise<IncomingApproval[]> {
  const resolved: IncomingApproval[] = [];
  const now = new Date();

  for (const part of parts) {
    const approval = await agentRepository.findApproval(
      actor.organizationId,
      actor.userId,
      part.approvalId,
    );
    if (!approval) {
      throw new DomainError("NOT_FOUND", "APPROVAL_NOT_FOUND");
    }

    const run = await agentRepository.findRun(approval.runId);
    if (!run || run.conversationId !== conversation.id) {
      throw new DomainError("NOT_FOUND", "APPROVAL_NOT_FOUND");
    }

    if (approval.status === "PENDING") {
      if (approval.expiresAt.getTime() <= now.getTime()) {
        await agentRepository.expireApprovals(now);
        throw new DomainError("CONFLICT", "APPROVAL_EXPIRED");
      }

      const decided = await agentRepository.decideApproval(
        approval.id,
        part.approved ? "APPROVED" : "REJECTED",
        actor.userId,
      );
      if (!decided) {
        throw new DomainError("CONFLICT", "APPROVAL_NOT_PENDING");
      }
    } else if (approval.status === "EXPIRED") {
      throw new DomainError("CONFLICT", "APPROVAL_EXPIRED");
    } else if (
      !["APPROVED", "REJECTED", "EXECUTED", "FAILED"].includes(approval.status)
    ) {
      throw new DomainError("CONFLICT", "APPROVAL_NOT_PENDING");
    }

    resolved.push({
      approval,
      approved: part.approved,
      toolCallId: part.toolCallId,
    });
  }

  return resolved;
}

async function persistNewApprovals(
  actor: OrganizationActor,
  run: AgentRunRecord,
  approvals: readonly ApprovalRequest[],
): Promise<void> {
  if (approvals.length === 0) return;

  const existing = await agentRepository.listApprovalsForRun(run.id);
  const known = new Set(existing.map((approval) => approval.callId));

  await agentRepository.createApprovals(
    approvals
      .filter((approval) => !known.has(approval.approvalId))
      .map((approval) => ({
        runId: run.id,
        organizationId: actor.organizationId,
        userId: actor.userId,
        callId: approval.approvalId,
        toolName: approval.toolName,
        arguments: approval.input,
        preview: approval.preview,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      })),
  );
}

function toolResultState(
  messages: readonly AssistantUIMessage[],
  toolCallId: string,
): "EXECUTED" | "FAILED" | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    for (const part of message.parts) {
      if (!isToolPart(part) || part.toolCallId !== toolCallId) continue;
      if (part.state === "output-available") return "EXECUTED";
      if (part.state === "output-error" || part.state === "output-denied") {
        return "FAILED";
      }
    }
  }

  return null;
}

async function finishIncomingApprovals(
  incoming: readonly IncomingApproval[],
  messages: readonly AssistantUIMessage[],
  failed: boolean,
): Promise<void> {
  for (const item of incoming) {
    if (!item.approved) continue;

    const state = failed
      ? "FAILED"
      : toolResultState(messages, item.toolCallId);
    if (!state) continue;

    await agentRepository.finishApproval(item.approval.id, state);
  }
}

async function usageFrom(
  usage: PromiseLike<LanguageModelUsage>,
): Promise<{inputTokens: number; outputTokens: number}> {
  try {
    const value = await usage;
    return {
      inputTokens: value.inputTokens ?? 0,
      outputTokens: value.outputTokens ?? 0,
    };
  } catch {
    return {inputTokens: 0, outputTokens: 0};
  }
}

/**
 * A single run may not exhaust the daily budget: the configured output ceiling
 * is reduced to whatever remains for the user today.
 */
export function runOutputTokenCeiling(
  config: {
    maxOutputTokens: number;
    maxRunTokens: number;
    dailyTokenBudget: number;
  },
  usedTokens: number,
): number {
  return Math.max(
    1,
    Math.min(
      config.maxOutputTokens,
      config.maxRunTokens,
      config.dailyTokenBudget - usedTokens,
    ),
  );
}

export function isTimeoutError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";

  return /timeout|timed out/i.test(`${name} ${message}`);
}

/**
 * Attribution metadata for AI Gateway logs. The user id is the Gateway's
 * end-user field; tags stay non-sensitive so spend can be filtered by persona
 * and environment without exposing prompts or identifiers.
 */
export function gatewayProviderOptions(input: {
  userId: string;
  persona: AssistantPersona;
  environment: string;
}): {gateway: {user: string; tags: string[]}} {
  return {
    gateway: {
      user: input.userId,
      tags: ["assistant", input.persona, input.environment],
    },
  };
}

/**
 * The terminal state of a run. A consumer cancellation (a disconnect or the
 * stop button) is recorded as ABORTED; a provider failure as FAILED.
 */
export function runOutcome(input: {
  isAborted: boolean;
  outcomeStatus: string;
  failureCode: "TIMEOUT" | null;
  awaitingApproval: boolean;
}): {status: string; errorCode: string | null} {
  const failed = input.isAborted || input.outcomeStatus === "failed";

  return {
    status:
      input.isAborted && !input.failureCode
        ? "ABORTED"
        : failed
          ? "FAILED"
          : input.awaitingApproval
            ? "AWAITING_APPROVAL"
            : "COMPLETED",
    errorCode: failed
      ? input.failureCode ?? (input.isAborted ? "STREAM_ABORTED" : "STREAM_FAILED")
      : null,
  };
}

export async function listConversations(
  actor: OrganizationActor,
  persona: AssistantPersona,
): Promise<AgentConversationRecord[]> {
  return agentRepository.listConversations(
    actor.organizationId,
    actor.userId,
    personaEnum(persona),
  );
}

export async function getConversationHistory(
  actor: OrganizationActor,
  conversationId: string,
): Promise<AssistantHistory | null> {
  const conversation = await agentRepository.findConversation(
    actor.organizationId,
    actor.userId,
    conversationId,
  );
  if (!conversation) return null;

  const rows = await agentRepository.getMessages(conversationId);
  const messages = rows
    .map(normalizeStoredMessage)
    .filter((message): message is AssistantUIMessage => message !== null);

  const pending = await agentRepository.listPendingApprovalsForConversation(
    conversationId,
  );

  return {
    conversation,
    messages,
    pendingApprovals: pending.map((approval) => ({
      id: approval.id,
      toolName: approval.toolName,
      preview: approval.preview as AssistantApprovalPreview,
    })),
  };
}

/**
 * Creates the UI-message response for one assistant turn. The route only
 * resolves the actor and validates the envelope; tenant, budget, approval and
 * persistence rules live here.
 */
export async function streamAssistantResponse(input: {
  actor: OrganizationActor;
  locale: Locale;
  request: AssistantMessageRequest;
  abortSignal?: AbortSignal;
}): Promise<Response> {
  const config = getAssistantConfig();
  if (!config) {
    throw new DomainError("NOT_FOUND", "ASSISTANT_DISABLED");
  }

  const {actor, locale, request} = input;
  const rawMessages = request.messages as UIMessage[];
  const incomingParts = incomingApprovalParts(request.messages);
  const isApprovalContinuation = incomingParts.length > 0;

  if (!isApprovalContinuation) {
    const recentRuns = await agentRepository.countRunsForUserSince(
      actor.userId,
      new Date(Date.now() - 10 * 60 * 1000),
    );
    if (recentRuns >= 30) {
      throw new DomainError("CONFLICT", "ASSISTANT_RATE_LIMITED");
    }
  }

  const conversation = await loadConversation(
    actor,
    request.persona,
    request.conversationId,
    lastUserText(request.messages),
  );

  await agentRepository.expireApprovals(new Date());

  const validationContext = buildAssistantContext({
    actor,
    persona: request.persona,
    locale,
    conversationId: conversation.id,
    runId: "",
  });
  const validationTools = buildToolSet(
    toolsFor(request.persona, validationContext.can),
    validationContext,
  );

  const messages = await validateUIMessages<AssistantUIMessage>({
    messages: rawMessages,
    tools: validationTools,
    metadataSchema: assistantMetadataSchema,
    dataSchemas: assistantDataSchemas,
  });

  const incoming = await applyIncomingApprovals(
    actor,
    conversation,
    incomingApprovalParts(messages),
  );

  const pending = await agentRepository.listPendingApprovalsForConversation(
    conversation.id,
  );
  if (pending.length > 0) {
    throw new DomainError("CONFLICT", "APPROVAL_PENDING");
  }

  const usedTokens = await agentRepository.sumTokensForUserSince(
    actor.userId,
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );
  if (usedTokens >= config.dailyTokenBudget) {
    throw new DomainError("CONFLICT", "ASSISTANT_BUDGET_EXCEEDED");
  }

  const run = await agentRepository.createRun({
    conversationId: conversation.id,
    persona: personaEnum(request.persona),
    model: request.persona === "emma" ? config.emmaModel : config.eleaModel,
  });

  const context = buildAssistantContext({
    actor,
    persona: request.persona,
    locale,
    conversationId: conversation.id,
    runId: run.id,
  });
  const agent = buildPersonaAgent(context, config);
  const approvalRequests: ApprovalRequest[] = [];
  const previewByCall = new Map<string, AssistantApprovalPreview>();
  let traceId: string | null = null;
  let usage: PromiseLike<LanguageModelUsage> | null = null;
  let failureCode: "TIMEOUT" | null = null;

  const stream = createUIMessageStream<AssistantUIMessage>({
    originalMessages: messages,
    onError: () =>
      locale === "fr"
        ? "L’assistant n’a pas pu terminer cette demande."
        : "The assistant could not complete this request.",
    execute: async ({writer}) => {
      const createdAt = new Date().toISOString();
      writer.write({
        type: "start",
        messageId: generateId(),
        messageMetadata: {createdAt},
      });
      writer.write({
        type: "data-conversation",
        data: {conversationId: conversation.id},
        transient: true,
      });

      const result = streamText({
        model: agent.model,
        instructions: agent.instructions,
        messages: await convertToModelMessages(messages),
        tools: agent.tools,
        toolApproval: async ({toolCall}) => {
          const definition = agent.definitions.find(
            (candidate) => candidate.name === toolCall.toolName,
          );
          if (!definition?.needsApproval) return undefined;

          const args = inputObject(toolCall.input);
          const preview =
            (await buildApprovalPreview({
              toolName: toolCall.toolName,
              args,
              context,
            }).catch(() => null)) ??
            previewFallback(toolCall.toolName, args, context);

          previewByCall.set(toolCall.toolCallId, preview);
          return {type: "user-approval", reason: preview.title};
        },
        stopWhen: isStepCount(config.maxTurns),
        abortSignal: input.abortSignal,
        maxOutputTokens: runOutputTokenCeiling(config, usedTokens),
        timeout: {totalMs: config.requestTimeoutMs},
        providerOptions: gatewayProviderOptions({
          userId: actor.userId,
          persona: request.persona,
          environment:
            process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
        }),
        experimental_toolApprovalSecret: config.toolApprovalSecret ?? undefined,
        telemetry: {isEnabled: config.telemetryEnabled},
        onChunk: ({chunk}) => {
          if (chunk.type === "tool-approval-request") {
            const args = inputObject(chunk.toolCall.input);
            const preview =
              previewByCall.get(chunk.toolCall.toolCallId) ??
              previewFallback(chunk.toolCall.toolName, args, context);

            approvalRequests.push({
              approvalId: chunk.approvalId,
              toolCallId: chunk.toolCall.toolCallId,
              toolName: chunk.toolCall.toolName,
              input: args,
              preview,
            });

            writer.write({
              type: "data-approval",
              id: chunk.approvalId,
              data: preview,
            });
          }

          const metadata = (
            chunk as {
              providerMetadata?: {
                gateway?: {generationId?: unknown};
              };
            }
          ).providerMetadata;
          if (
            !traceId &&
            metadata?.gateway?.generationId &&
            typeof metadata.gateway.generationId === "string"
          ) {
            traceId = metadata.gateway.generationId;
          }
        },
        onError: ({error}) => {
          if (isTimeoutError(error)) failureCode = "TIMEOUT";
          console.error("Assistant stream failed", error);
        },
      });

      usage = result.usage;

      writer.merge(
        toUIMessageStream<typeof agent.tools, AssistantUIMessage>({
          stream: result.stream,
          tools: agent.tools,
          sendStart: false,
          originalMessages: messages,
          messageMetadata: ({part}) =>
            part.type === "finish" ? {createdAt} : undefined,
          onError: () =>
            locale === "fr"
              ? "L’assistant n’a pas pu terminer cette demande."
              : "The assistant could not complete this request.",
        }),
      );
    },
    onEnd: async ({messages: allMessages, responseMessage, isAborted, outcome}) => {
      const persistedMessages = allMessages.some(
        (message) => message.id === responseMessage.id,
      )
        ? allMessages
        : [...messages, responseMessage];

      await agentRepository.replaceMessages(conversation.id, persistedMessages);
      await persistNewApprovals(actor, run, approvalRequests);

      const failed = isAborted || outcome.status === "failed";
      await finishIncomingApprovals(incoming, persistedMessages, failed);

      const tokens = usage
        ? await usageFrom(usage)
        : {inputTokens: 0, outputTokens: 0};
      const awaitingApproval = !failed && approvalRequests.length > 0;
      const terminal = runOutcome({
        isAborted,
        outcomeStatus: outcome.status,
        failureCode,
        awaitingApproval,
      });

      await agentRepository.updateRun(run.id, {
        status: terminal.status,
        state: null,
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        traceId,
        errorCode: terminal.errorCode,
      });

      await agentRepository.touchConversation(
        conversation.id,
        conversation.title,
      );
    },
  });

  return createUIMessageStreamResponse({stream});
}
