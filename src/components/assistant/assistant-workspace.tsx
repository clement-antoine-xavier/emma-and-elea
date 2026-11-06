"use client";

import {useCallback, useMemo, useRef, useState} from "react";
import {useChat} from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import {usePathname, useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {AssistantChat, type AssistantChatHandle} from "./assistant-chat";
import {AssistantLanding} from "./assistant-landing";
import {
  toolLabel,
  type AssistantApprovalPreview,
  type AssistantConversationSummary,
  type AssistantPendingApproval,
  type AssistantPersona,
  type AssistantToolCall,
  type AssistantTurn,
  type AssistantUIMessage,
} from "@/lib/assistant";

const STREAM_PATH = "/dashboard/assistant/stream";
const LANDING_PATH = "/dashboard/assistant";

type AssistantWorkspaceProps = {
  personas: AssistantPersona[];
  memberName: string;
  initialConversationId?: string;
  initialPersona?: AssistantPersona;
  initialMessages?: AssistantUIMessage[];
  initialApprovals?: AssistantPendingApproval[];
  initialRecent?: AssistantConversationSummary[];
};

type DataPart = UIMessage["parts"][number];

function textFromParts(parts: readonly DataPart[]): string {
  return parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

function toolCallsFromParts(
  parts: readonly DataPart[],
  locale: "en" | "fr",
): AssistantToolCall[] {
  const calls: AssistantToolCall[] = [];

  for (const part of parts) {
    if (!isToolUIPart(part)) continue;

    const name = part.type.replace(/^tool-/, "");
    const status =
      part.state === "output-available"
        ? "complete"
        : part.state === "output-error" || part.state === "output-denied"
          ? "error"
          : "running";

    calls.push({
      id: part.toolCallId,
      name,
      label: toolLabel(name, locale),
      status,
      startedAt: 0,
    });
  }

  return calls;
}

function fallbackPreview(
  toolName: string,
  input: unknown,
  locale: "en" | "fr",
): AssistantApprovalPreview {
  const facts =
    typeof input === "object" && input !== null
      ? Object.entries(input as Record<string, unknown>)
          .filter(
            ([, value]) =>
              value !== null && value !== undefined && value !== "",
          )
          .slice(0, 8)
          .map(([label, value]) => ({
            label,
            value: typeof value === "string" ? value : JSON.stringify(value),
          }))
      : [];

  return {
    title: toolLabel(toolName, locale),
    summary:
      locale === "fr"
        ? "L’assistant souhaite exécuter cette action."
        : "The assistant wants to run this action.",
    facts,
  };
}

export function AssistantWorkspace({
  personas,
  memberName,
  initialConversationId,
  initialPersona,
  initialMessages,
  initialApprovals,
  initialRecent,
}: AssistantWorkspaceProps) {
  const t = useTranslations("Dashboard.assistant");
  const locale = useLocale() === "fr" ? "fr" : "en";
  const router = useRouter();
  const pathname = usePathname();
  const chatRef = useRef<AssistantChatHandle>(null);

  const [persona, setPersona] = useState<AssistantPersona>(
    initialPersona ?? personas[0] ?? "emma",
  );
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [recent, setRecent] = useState<AssistantConversationSummary[]>(
    initialRecent ?? [],
  );
  const [draft, setDraft] = useState("");
  const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [serverApprovals, setServerApprovals] =
    useState<AssistantPendingApproval[]>(initialApprovals ?? []);


  const refreshRecent = useCallback(async () => {
    try {
      const response = await fetch(
        `${STREAM_PATH}?persona=${persona}`,
        {headers: {accept: "application/json"}},
      );
      if (!response.ok) return;

      const body = (await response.json()) as {
        conversations: AssistantConversationSummary[];
      };

      setRecent(
        body.conversations
          .map((conversation) => ({
            ...conversation,
            persona: conversation.persona.toLowerCase() as AssistantPersona,
          }))
          .slice(0, 5),
      );
    } catch {
      // The landing page stays usable without recent conversations.
    }
  }, [persona]);

  const transport = new DefaultChatTransport<AssistantUIMessage>({
    api: STREAM_PATH,
    body: {
      persona,
      conversationId: conversationId ?? undefined,
    },
  });

  const {
    messages,
    sendMessage,
    status,
    error: chatError,
    setMessages,
    stop,
    addToolApprovalResponse,
  } = useChat<AssistantUIMessage>({
    id: initialConversationId,
    messages: initialMessages ?? [],
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onData: (part) => {
      if (part.type !== "data-conversation") return;
      const next = part.data.conversationId;
      setConversationId(next);
      window.history.replaceState(
        null,
        "",
        `${LANDING_PATH}/${next}`,
      );
    },
    onFinish: () => {
      setBusyApprovalId(null);
      void refreshRecent();
    },
    onError: (error) => {
      setBusyApprovalId(null);
      setStreamError(error.message);
    },
  });

  const isStreaming = status === "submitted" || status === "streaming";

  const turns = useMemo<AssistantTurn[]>(() => {
    return messages.map((message) => ({
      id: message.id,
      role: message.role,
      text: textFromParts(message.parts),
      createdAt: message.metadata?.createdAt,
      persona,
      toolCalls:
        message.role === "assistant"
          ? toolCallsFromParts(message.parts, locale)
          : undefined,
    }));
  }, [locale, messages, persona]);

  const lastMessage = messages.at(-1);
  const streamingAssistant =
    isStreaming && lastMessage?.role === "assistant";
  const visibleTurns = streamingAssistant ? turns.slice(0, -1) : turns;
  const streamingText =
    streamingAssistant && lastMessage ? textFromParts(lastMessage.parts) : "";
  const streamingCalls =
    streamingAssistant && lastMessage
      ? toolCallsFromParts(lastMessage.parts, locale)
      : [];

  const approvals = useMemo<AssistantPendingApproval[]>(() => {
    const previews = new Map<string, AssistantApprovalPreview>();
    const names = new Map<string, string>();

    for (const approval of serverApprovals) {
      previews.set(approval.id, approval.preview);
      names.set(approval.id, approval.toolName);
    }

    for (const message of messages) {
      for (const part of message.parts) {
        if (part.type === "data-approval" && part.id) {
          previews.set(part.id, part.data);
        }
      }
    }

    const pending = new Map<string, string>();
    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolUIPart(part)) continue;
        if (part.state !== "approval-requested") continue;
        if (part.approval.isAutomatic) continue;

        const id = part.approval.id;
        const toolName = part.type.replace(/^tool-/, "");
        pending.set(id, toolName);
        names.set(id, toolName);
      }
    }

    return [...pending.entries()].map(([id, toolName]) => ({
      id,
      toolName,
      preview:
        previews.get(id) ?? fallbackPreview(toolName, undefined, locale),
    }));
  }, [locale, messages, serverApprovals]);

  const handlePersonaChange = useCallback(
    (nextPersona: AssistantPersona) => {
      if (nextPersona === persona) return;
      setPersona(nextPersona);

      if (
        conversationId ||
        messages.length > 0 ||
        isStreaming
      ) {
        stop();
        setMessages([]);
        setConversationId(null);
        setServerApprovals([]);
        setBusyApprovalId(null);
        setStreamError(null);
        setDraft("");
        if (pathname !== LANDING_PATH) {
          router.push(
            nextPersona === personas[0]
              ? LANDING_PATH
              : `${LANDING_PATH}?persona=${nextPersona}`,
          );
        }
      }
    },
    [
      conversationId,
      isStreaming,
      messages.length,
      pathname,
      personas,
      persona,
      router,
      setMessages,
      stop,
    ],
  );

  const handleNewChat = useCallback(() => {
    stop();
    setMessages([]);
    setConversationId(null);
    setServerApprovals([]);
    setBusyApprovalId(null);
    setStreamError(null);
    setDraft("");
    void refreshRecent();

    if (pathname !== LANDING_PATH) {
      router.push(
        persona === personas[0]
          ? LANDING_PATH
          : `${LANDING_PATH}?persona=${persona}`,
      );
    }
  }, [
    pathname,
    persona,
    personas,
    refreshRecent,
    router,
    setMessages,
    stop,
  ]);

  const submit = useCallback(
    (value: string) => {
      const text = value.trim();
      if (!text || isStreaming || approvals.length > 0) return;

      setDraft("");
      setStreamError(null);
      void sendMessage({
        text,
        metadata: {createdAt: new Date().toISOString()},
      });
    },
    [approvals.length, isStreaming, sendMessage],
  );

  const decide = useCallback(
    (approval: AssistantPendingApproval, decision: "approve" | "reject") => {
      if (busyApprovalId) return;

      setBusyApprovalId(approval.id);
      setStreamError(null);
      void Promise.resolve(
        addToolApprovalResponse({
          id: approval.id,
          approved: decision === "approve",
        }),
      ).catch((error: unknown) => {
        setBusyApprovalId(null);
        setStreamError(
          error instanceof Error ? error.message : t("errors.approval"),
        );
      });
    },
    [addToolApprovalResponse, busyApprovalId, t],
  );

  const error = streamError ?? chatError?.message ?? null;
  const showChat =
    (initialMessages?.length ?? 0) > 0 ||
    messages.length > 0 ||
    conversationId !== null ||
    isStreaming;

  if (!showChat) {
    return (
      <AssistantLanding
        personas={personas}
        persona={persona}
        onPersonaChange={handlePersonaChange}
        memberName={memberName}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={submit}
        recent={recent}
        isSending={isStreaming}
        error={error}
      />
    );
  }

  return (
    <AssistantChat
      ref={chatRef}
      personas={personas}
      persona={persona}
      onPersonaChange={handlePersonaChange}
      turns={visibleTurns}
      streamingText={streamingText}
      toolCalls={streamingCalls}
      approvals={approvals}
      busyApprovalId={busyApprovalId}
      isStreaming={isStreaming}
      error={error}
      draft={draft}
      onDraftChange={setDraft}
      onSubmit={submit}
      onNewChat={handleNewChat}
      onDecide={decide}
    />
  );
}
