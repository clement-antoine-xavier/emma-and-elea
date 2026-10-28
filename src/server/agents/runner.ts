import {
  RunState,
  run,
  type RunStreamEvent,
} from "@openai/agents";
import type {AgentInputItem} from "@openai/agents";
import type {AssistantPersona} from "@/lib/assistant";
import {toolLabel, type AssistantStreamEvent} from "@/lib/assistant";
import type {Locale} from "@/i18n/routing";
import type {OrganizationActor} from "@/server/auth/types";
import {
  agentRepository,
  type AgentConversationRecord,
  type AgentRunRecord,
} from "@/server/repositories/agent.repository";
import {buildApprovalPreview} from "./approvals/preview";
import {getAssistantConfig} from "./config";
import {
  buildAssistantContext,
  personaEnum,
  type AssistantContext,
} from "./context";
import {ensureModelProvider} from "./model";
import {buildPersonaAgent} from "./personas";
import {PrismaAgentSession} from "./session";

export type AssistantMessageRequest = {
  type: "message";
  persona: AssistantPersona;
  conversationId?: string;
  text: string;
};

export type AssistantApprovalRequest = {
  type: "approval";
  persona: AssistantPersona;
  conversationId: string;
  approvalId: string;
  decision: "approve" | "reject";
};

export type AssistantRequest =
  | AssistantMessageRequest
  | AssistantApprovalRequest;

export type AssistantHistory = {
  conversation: AgentConversationRecord;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    text: string;
    createdAt: string;
  }>;
  pendingApprovals: Array<{
    id: string;
    toolName: string;
    preview: unknown;
  }>;
};

function textFromItem(item: AgentInputItem): string | null {
  const message = item as {
    type?: string;
    role?: string;
    content?: unknown;
  };
  if (message.type !== undefined && message.type !== "message") return null;
  if (message.role !== "user" && message.role !== "assistant") return null;

  const parts = Array.isArray(message.content)
    ? message.content
    : [{type: "input_text", text: String(message.content ?? "")}];

  const text = parts
    .map((part) => {
      if (typeof part === "string") return part;
      if ("text" in part && typeof part.text === "string") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");

  return text || null;
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
  const messages = rows.flatMap((row) => {
    const item = row.item as AgentInputItem;
    const text = textFromItem(item);
    if (!text) return [];

    return [
      {
        id: row.id,
        role: ((item as {role?: string}).role === "assistant"
          ? "assistant"
          : "user") as "assistant" | "user",
        text,
        createdAt: row.createdAt.toISOString(),
      },
    ];
  });

  const pending = await agentRepository.listPendingApprovalsForConversation(
    conversationId,
  );

  return {
    conversation,
    messages,
    pendingApprovals: pending.map((approval) => ({
      id: approval.id,
      toolName: approval.toolName,
      preview: approval.preview,
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
      throw new Error("CONVERSATION_NOT_FOUND");
    }
    await agentRepository.touchConversation(conversation.id);
    return conversation;
  }

  const title = firstText.trim().slice(0, 80) || null;
  return agentRepository.createConversation({
    organizationId: actor.organizationId,
    userId: actor.userId,
    persona: personaEnum(persona),
    title,
  });
}

function interruptionCallId(
  interruption: {rawItem?: unknown; name?: string},
  index: number,
): string {
  const raw = (interruption.rawItem ?? {}) as {
    callId?: string;
    id?: string;
  };

  return raw.callId ?? raw.id ?? `${interruption.name ?? "tool"}-${index}`;
}

function interruptionArguments(
  interruption: {arguments?: string},
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(interruption.arguments ?? "{}");
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function persistApprovals(input: {
  context: AssistantContext;
  run: AgentRunRecord;
  interruptions: Array<{
    name?: string;
    arguments?: string;
    rawItem?: unknown;
  }>;
}): Promise<AssistantStreamEvent[]> {
  const existing = await agentRepository.listApprovalsForRun(input.run.id);
  const known = new Set(existing.map((approval) => approval.callId));
  const events: AssistantStreamEvent[] = [];
  const toCreate: Array<{
    runId: string;
    organizationId: string;
    userId: string;
    callId: string;
    toolName: string;
    arguments: Record<string, unknown>;
    preview: unknown;
    expiresAt: Date;
  }> = [];

  for (const [index, interruption] of input.interruptions.entries()) {
    const toolName = interruption.name ?? "unknown_tool";
    const callId = interruptionCallId(interruption, index);
    if (known.has(callId)) continue;

    const args = interruptionArguments(interruption);
    const preview = await buildApprovalPreview({
      toolName,
      args,
      context: input.context,
    });

    toCreate.push({
      runId: input.run.id,
      organizationId: input.context.actor.organizationId,
      userId: input.context.actor.userId,
      callId,
      toolName,
      arguments: args,
      preview,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
  }

  const created = await agentRepository.createApprovals(toCreate);
  for (const approval of [...existing, ...created]) {
    if (approval.status !== "PENDING") continue;
    events.push({
      type: "approval",
      approvalId: approval.id,
      toolName: approval.toolName,
      preview: approval.preview as never,
    });
  }

  return events;
}

// The SDK's generic variance is stricter than the surface we consume here.
// This structural type keeps the runner decoupled from the concrete generics.
type AssistantRunStream = AsyncIterable<RunStreamEvent> & {
  readonly state: {
    readonly usage: {inputTokens: number; outputTokens: number};
    toString(options?: {includeTracingApiKey?: boolean}): string;
  };
  readonly finalOutput?: unknown;
  readonly interruptions: ReadonlyArray<{
    name?: string;
    arguments?: string;
    rawItem?: unknown;
  }>;
};

async function consumeRun(
  stream: AssistantRunStream,
  context: AssistantContext,
): Promise<{
  text: string;
  interruptions: Array<{
    name?: string;
    arguments?: string;
    rawItem?: unknown;
  }>;
  state: string;
  inputTokens: number;
  outputTokens: number;
  events: AssistantStreamEvent[];
}> {
  const events: AssistantStreamEvent[] = [];
  let text = "";

  for await (const event of stream) {
    if (event.type === "raw_model_stream_event") {
      if (event.data.type === "output_text_delta") {
        const delta = event.data.delta;
        text += delta;
        events.push({type: "text", delta});
      }
      continue;
    }

    if (event.type === "run_item_stream_event") {
      if (event.name === "tool_called") {
        const name =
          (event.item.rawItem as {name?: string; toolName?: string}).name ??
          (event.item.rawItem as {toolName?: string}).toolName ??
          "tool";
        events.push({
          type: "tool",
          phase: "start",
          name,
          label: toolLabel(name, context.locale),
        });
      }

      if (event.name === "tool_output") {
        if (event.item.type !== "tool_call_output_item") continue;
        const name =
          (event.item.rawItem as {name?: string; toolName?: string}).name ??
          (event.item.rawItem as {toolName?: string}).toolName ??
          "tool";
        const output =
          typeof event.item.output === "string"
            ? event.item.output
            : JSON.stringify(event.item.output ?? "");
        events.push({
          type: "tool",
          phase: "end",
          name,
          label: toolLabel(name, context.locale),
          status: output.includes('"error"') ? "error" : "ok",
        });
      }
    }
  }

  const usage = stream.state.usage;

  // The Responses API streams output_text_delta events. Chat Completions
  // providers (DeepSeek, most OpenAI-compatible gateways) deliver the final
  // text on the result instead, so fall back to it when no delta arrived.
  if (!text && typeof stream.finalOutput === "string") {
    text = stream.finalOutput;
    events.push({type: "text", delta: text});
  }

  return {
    text,
    interruptions: stream.interruptions.map((interruption) => ({
      name: interruption.name,
      arguments: interruption.arguments,
      rawItem: interruption.rawItem,
    })),
    state: stream.state.toString(),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    events,
  };
}

async function* streamMessage(
  actor: OrganizationActor,
  request: AssistantMessageRequest,
  locale: Locale,
): AsyncGenerator<AssistantStreamEvent> {
  const config = getAssistantConfig();
  if (!config) throw new Error("ASSISTANT_DISABLED");
  await ensureModelProvider(config);

  const conversation = await loadConversation(
    actor,
    request.persona,
    request.conversationId,
    request.text,
  );

  const pending = await agentRepository.listPendingApprovalsForConversation(
    conversation.id,
  );
  if (pending.length > 0) throw new Error("APPROVAL_PENDING");

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const usedTokens = await agentRepository.sumTokensForUserSince(
    actor.userId,
    dayAgo,
  );
  if (usedTokens >= config.dailyTokenBudget) {
    throw new Error("ASSISTANT_BUDGET_EXCEEDED");
  }

  const createdRun = await agentRepository.createRun({
    conversationId: conversation.id,
    persona: personaEnum(request.persona),
    model: request.persona === "emma" ? config.emmaModel : config.eleaModel,
  });
  const context = buildAssistantContext({
    actor,
    persona: request.persona,
    locale,
    conversationId: conversation.id,
    runId: createdRun.id,
  });
  const agent = buildPersonaAgent(context, config);
  const session = new PrismaAgentSession(conversation.id);

  yield {
    type: "start",
    runId: createdRun.id,
    conversationId: conversation.id,
  };

  try {
    const stream = await run(agent, request.text, {
      stream: true,
      context,
      session,
      maxTurns: config.maxTurns,
    });
    const result = await consumeRun(stream, context);

    for (const event of result.events) yield event;

    const approvalEvents = await persistApprovals({
      context,
      run: createdRun,
      interruptions: result.interruptions,
    });

    if (result.interruptions.length > 0) {
      await agentRepository.updateRun(createdRun.id, {
        status: "AWAITING_APPROVAL",
        state: result.state,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });
      for (const event of approvalEvents) yield event;
    } else {
      await agentRepository.updateRun(createdRun.id, {
        status: "COMPLETED",
        state: null,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });
    }

    await agentRepository.touchConversation(conversation.id, conversation.title);
    yield {
      type: "done",
      conversationId: conversation.id,
      runId: createdRun.id,
    };
  } catch (error) {
    await agentRepository.updateRun(createdRun.id, {
      status: "FAILED",
      errorCode: error instanceof Error ? error.message : "UNEXPECTED",
    });
    throw error;
  }
}

async function* streamApproval(
  actor: OrganizationActor,
  request: AssistantApprovalRequest,
  locale: Locale,
): AsyncGenerator<AssistantStreamEvent> {
  const config = getAssistantConfig();
  if (!config) throw new Error("ASSISTANT_DISABLED");
  await ensureModelProvider(config);

  const approval = await agentRepository.findApproval(
    actor.organizationId,
    actor.userId,
    request.approvalId,
  );
  if (!approval) throw new Error("APPROVAL_NOT_FOUND");
  if (approval.status !== "PENDING") throw new Error("APPROVAL_NOT_PENDING");
  if (approval.expiresAt.getTime() < Date.now()) {
    await agentRepository.expireApprovals(new Date());
    throw new Error("APPROVAL_EXPIRED");
  }

  const runRecord = await agentRepository.findRun(approval.runId);
  if (!runRecord || !runRecord.state) throw new Error("RUN_NOT_RESUMABLE");

  const conversation = await agentRepository.findConversation(
    actor.organizationId,
    actor.userId,
    runRecord.conversationId,
  );
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");

  const persona =
    runRecord.persona === "EMMA" ? ("emma" as const) : ("elea" as const);
  if (request.persona !== persona) throw new Error("PERSONA_MISMATCH");

  const decided = await agentRepository.decideApproval(
    approval.id,
    request.decision === "approve" ? "APPROVED" : "REJECTED",
    actor.userId,
  );
  if (!decided) throw new Error("APPROVAL_ALREADY_DECIDED");

  const context = buildAssistantContext({
    actor,
    persona,
    locale,
    conversationId: conversation.id,
    runId: runRecord.id,
  });
  const agent = buildPersonaAgent(context, config);
  const session = new PrismaAgentSession(conversation.id);

  yield {type: "start", runId: runRecord.id, conversationId: conversation.id};

  try {
    const state = await RunState.fromString<AssistantContext, typeof agent>(
      agent,
      runRecord.state,
    );
    const interruption = state
      .getInterruptions()
      .find(
        (item) =>
          interruptionCallId(item, 0) === approval.callId ||
          item.name === approval.toolName,
      );

    if (!interruption) throw new Error("APPROVAL_INTERRUPTION_NOT_FOUND");

    if (request.decision === "approve") {
      state.approve(interruption);
    } else {
      state.reject(interruption, {
        message:
          locale === "fr"
            ? "L’utilisateur a refusé cette action."
            : "The user rejected this action.",
      });
    }

    const stream = await run(agent, state, {
      stream: true,
      context,
      session,
      maxTurns: config.maxTurns,
    });
    const result = await consumeRun(stream, context);

    for (const event of result.events) yield event;

    const approvalEvents = await persistApprovals({
      context,
      run: runRecord,
      interruptions: result.interruptions,
    });

    if (result.interruptions.length > 0) {
      await agentRepository.updateRun(runRecord.id, {
        status: "AWAITING_APPROVAL",
        state: result.state,
        inputTokens: runRecord.inputTokens + result.inputTokens,
        outputTokens: runRecord.outputTokens + result.outputTokens,
      });
      for (const event of approvalEvents) yield event;
    } else {
      await agentRepository.updateRun(runRecord.id, {
        status: "COMPLETED",
        state: null,
        inputTokens: runRecord.inputTokens + result.inputTokens,
        outputTokens: runRecord.outputTokens + result.outputTokens,
      });
    }

    if (request.decision === "approve") {
      await agentRepository.finishApproval(approval.id, "EXECUTED");
    }

    yield {
      type: "done",
      conversationId: conversation.id,
      runId: runRecord.id,
    };
  } catch (error) {
    await agentRepository.finishApproval(approval.id, "FAILED");
    await agentRepository.updateRun(runRecord.id, {
      status: "FAILED",
      errorCode: error instanceof Error ? error.message : "UNEXPECTED",
    });
    throw error;
  }
}

export function streamAssistant(input: {
  actor: OrganizationActor;
  locale: Locale;
  request: AssistantRequest;
}): AsyncGenerator<AssistantStreamEvent> {
  return input.request.type === "approval"
    ? streamApproval(input.actor, input.request, input.locale)
    : streamMessage(input.actor, input.request, input.locale);
}
