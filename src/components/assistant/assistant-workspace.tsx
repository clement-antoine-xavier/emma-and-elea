"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {usePathname, useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {AssistantChat, type AssistantChatHandle} from "./assistant-chat";
import {AssistantLanding} from "./assistant-landing";
import {readAssistantEventStream} from "@/lib/assistant-stream";
import {
  PERSONAS,
  toolLabel,
  type AssistantConversationSummary,
  type AssistantPendingApproval,
  type AssistantPersona,
  type AssistantStreamEvent,
  type AssistantToolCall,
  type AssistantTurn,
} from "@/lib/assistant";

const STREAM_PATH = "/dashboard/assistant/stream";
const LANDING_PATH = "/dashboard/assistant";

type AssistantWorkspaceProps = {
  personas: AssistantPersona[];
  memberName: string;
  initialConversationId?: string;
  initialPersona?: AssistantPersona;
  initialTurns?: AssistantTurn[];
  initialApprovals?: AssistantPendingApproval[];
  initialRecent?: AssistantConversationSummary[];
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function AssistantWorkspace({
  personas,
  memberName,
  initialConversationId,
  initialPersona,
  initialTurns,
  initialApprovals,
  initialRecent,
}: AssistantWorkspaceProps) {
  const t = useTranslations("Dashboard.assistant");
  const locale = useLocale() === "fr" ? "fr" : "en";
  const router = useRouter();
  const pathname = usePathname();
  const abortRef = useRef<AbortController | null>(null);
  const chatRef = useRef<AssistantChatHandle>(null);

  const [persona, setPersona] = useState<AssistantPersona>(
    initialPersona ?? personas[0] ?? "emma",
  );
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [turns, setTurns] = useState<AssistantTurn[]>(initialTurns ?? []);
  const [recent, setRecent] = useState<AssistantConversationSummary[]>(
    initialRecent ?? [],
  );
  const [draft, setDraft] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [toolCalls, setToolCalls] = useState<AssistantToolCall[]>([]);
  const [approvals, setApprovals] = useState<AssistantPendingApproval[]>(
    initialApprovals ?? [],
  );
  const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const landingHref = useCallback(
    (nextPersona: AssistantPersona) =>
      nextPersona === personas[0]
        ? LANDING_PATH
        : `${LANDING_PATH}?persona=${nextPersona}`,
    [personas],
  );

  const appendTurn = useCallback(
    (
      turn: Pick<AssistantTurn, "role" | "text"> &
        Partial<Pick<AssistantTurn, "persona" | "toolCalls">>,
    ) => {
      setTurns((current) => [
        ...current,
        {
          id: newId(turn.role),
          createdAt: new Date().toISOString(),
          ...turn,
        },
      ]);
    },
    [],
  );

  const resetConversation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setConversationId(null);
    setTurns([]);
    setApprovals([]);
    setBusyApprovalId(null);
    setError(null);
    setDraft("");
    setStreamingText("");
    setToolCalls([]);
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    if (conversationId) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`${STREAM_PATH}?persona=${persona}`, {
          headers: {accept: "application/json"},
        });
        if (!response.ok) return;

        const body = (await response.json()) as {
          conversations: AssistantConversationSummary[];
        };
        if (!cancelled) {
          setRecent(
            body.conversations
              .map((conversation) => ({
                ...conversation,
                persona: conversation.persona.toLowerCase() as AssistantPersona,
              }))
              .slice(0, 5),
          );
        }
      } catch {
        // The landing page stays usable without recent conversations.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, persona]);

  const handlePersonaChange = useCallback(
    (nextPersona: AssistantPersona) => {
      if (nextPersona === persona) return;
      setPersona(nextPersona);

      if (conversationId || turns.length > 0 || isStreaming) {
        resetConversation();
        if (pathname !== LANDING_PATH) router.push(landingHref(nextPersona));
      }
    },
    [
      conversationId,
      isStreaming,
      landingHref,
      pathname,
      persona,
      resetConversation,
      router,
      turns.length,
    ],
  );

  const handleNewChat = useCallback(() => {
    resetConversation();
    if (pathname !== LANDING_PATH) router.push(landingHref(persona));
  }, [landingHref, pathname, persona, resetConversation, router]);

  const handleEvent = useCallback(
    (
      event: AssistantStreamEvent,
      state: {
        assistantText: string;
        calls: AssistantToolCall[];
        persona: AssistantPersona;
      },
    ) => {
      switch (event.type) {
        case "start": {
          setConversationId(event.conversationId);
          const nextPath = `${LANDING_PATH}/${event.conversationId}`;
          if (window.location.pathname !== nextPath) {
            window.history.replaceState(null, "", nextPath);
          }
          break;
        }
        case "text": {
          state.assistantText += event.delta;
          setStreamingText(state.assistantText);
          break;
        }
        case "tool": {
          if (event.phase === "start") {
            state.calls = [
              ...state.calls,
              {
                id: newId(event.name),
                name: event.name,
                label: event.label || toolLabel(event.name, locale),
                status: "running",
                startedAt: Date.now(),
              },
            ];
          } else {
            state.calls = state.calls.map((call) =>
              call.name === event.name && call.status === "running"
                ? {
                    ...call,
                    status: event.status === "error" ? "error" : "complete",
                    durationMs: Date.now() - call.startedAt,
                  }
                : call,
            );
          }
          setToolCalls(state.calls);
          break;
        }
        case "approval": {
          setApprovals((current) => [
            ...current.filter((item) => item.id !== event.approvalId),
            {
              id: event.approvalId,
              toolName: event.toolName,
              preview: event.preview,
            },
          ]);
          chatRef.current?.openReview();
          break;
        }
        case "handoff": {
          state.persona = event.persona;
          setPersona(event.persona);
          appendTurn({
            role: "system",
            text: t("handoff", {name: PERSONAS[event.persona].name}),
          });
          break;
        }
        case "done": {
          if (state.assistantText.trim()) {
            appendTurn({
              role: "assistant",
              text: state.assistantText,
              persona: state.persona,
              toolCalls: state.calls,
            });
          }
          setStreamingText("");
          setToolCalls([]);
          break;
        }
        case "error": {
          setError(event.message);
          break;
        }
      }
    },
    [appendTurn, locale, t],
  );

  const consumeStream = useCallback(
    async (
      body: Record<string, unknown>,
      state: {
        assistantText: string;
        calls: AssistantToolCall[];
        persona: AssistantPersona;
      },
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(STREAM_PATH, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      await readAssistantEventStream(response, (event) =>
        handleEvent(event, state),
      );
    },
    [handleEvent],
  );

  const sendMessage = useCallback(
    async (value: string) => {
      const text = value.trim();
      if (!text || isStreaming) return;

      setDraft("");
      setError(null);
      setStreamingText("");
      setToolCalls([]);
      setIsStreaming(true);
      appendTurn({role: "user", text});

      const state = {
        assistantText: "",
        calls: [] as AssistantToolCall[],
        persona,
      };

      try {
        await consumeStream(
          {
            type: "message",
            persona,
            conversationId: conversationId ?? undefined,
            text,
          },
          state,
        );
      } catch (sendError) {
        if (!isAbortError(sendError)) {
          setError(
            sendError instanceof Error ? sendError.message : t("errors.send"),
          );
        }
      } finally {
        setIsStreaming(false);
        setStreamingText("");
        setToolCalls([]);
      }
    },
    [
      appendTurn,
      consumeStream,
      conversationId,
      isStreaming,
      persona,
      t,
    ],
  );

  const decide = useCallback(
    async (
      approval: AssistantPendingApproval,
      decision: "approve" | "reject",
    ) => {
      if (!conversationId || busyApprovalId) return;

      setBusyApprovalId(approval.id);
      setError(null);
      setStreamingText("");
      setToolCalls([]);
      setIsStreaming(true);

      const state = {
        assistantText: "",
        calls: [] as AssistantToolCall[],
        persona,
      };

      try {
        await consumeStream(
          {
            type: "approval",
            persona,
            conversationId,
            approvalId: approval.id,
            decision,
          },
          state,
        );
        setApprovals((current) =>
          current.filter((item) => item.id !== approval.id),
        );
      } catch (decisionError) {
        if (!isAbortError(decisionError)) {
          const message =
            decisionError instanceof Error
              ? decisionError.message
              : t("errors.approval");
          setError(message);
          if (
            message.includes("APPROVAL_EXPIRED") ||
            message.includes("APPROVAL_NOT_PENDING")
          ) {
            setApprovals((current) =>
              current.filter((item) => item.id !== approval.id),
            );
          }
        }
      } finally {
        setBusyApprovalId(null);
        setIsStreaming(false);
        setStreamingText("");
        setToolCalls([]);
      }
    },
    [
      busyApprovalId,
      consumeStream,
      conversationId,
      persona,
      t,
    ],
  );

  const showChat =
    initialConversationId != null ||
    conversationId !== null ||
    turns.length > 0 ||
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
        onSubmit={(value) => void sendMessage(value)}
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
      turns={turns}
      streamingText={streamingText}
      toolCalls={toolCalls}
      approvals={approvals}
      busyApprovalId={busyApprovalId}
      isStreaming={isStreaming}
      error={error}
      draft={draft}
      onDraftChange={setDraft}
      onSubmit={(value) => void sendMessage(value)}
      onNewChat={handleNewChat}
      onDecide={(approval, decision) => void decide(approval, decision)}
    />
  );
}
