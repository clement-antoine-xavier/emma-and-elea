"use client";

import {useMemo, useState} from "react";
import {Badge} from "@astryxdesign/core/Badge";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {
  ChatComposer,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
} from "@astryxdesign/core/Chat";
import {Card} from "@astryxdesign/core/Card";
import {Divider} from "@astryxdesign/core/Divider";
import {Drawer, DrawerHeader} from "@astryxdesign/core/Drawer";
import {HStack} from "@astryxdesign/core/HStack";
import {Icon} from "@astryxdesign/core/Icon";
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from "@astryxdesign/core/Layout";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {Stack} from "@astryxdesign/core/Stack";
import {Text} from "@astryxdesign/core/Text";
import {ArrowLeftRight, Sparkles} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {
  PERSONAS,
  type AssistantApprovalPreview,
  type AssistantHistoryMessage,
  type AssistantPersona,
  type AssistantStreamEvent,
} from "@/lib/assistant";

type PendingApproval = {
  id: string;
  toolName: string;
  preview: AssistantApprovalPreview;
};

function useAssistantMessages() {
  return useState<AssistantHistoryMessage[]>([]);
}

async function readEventStream(
  response: Response,
  onEvent: (event: AssistantStreamEvent) => void,
): Promise<void> {
  if (!response.ok || !response.body) {
    let message = "The assistant is unavailable.";
    try {
      const body = (await response.json()) as {error?: string};
      message = body.error ?? message;
    } catch {
      // Keep the default message.
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const {value, done} = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, {stream: true});

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const data = chunk
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .join("\n");

      if (data) onEvent(JSON.parse(data) as AssistantStreamEvent);
      boundary = buffer.indexOf("\n\n");
    }
  }
}

function MessageBody({text}: {text: string}) {
  return (
    <Stack gap={1}>
      {text.split("\n").map((line, index) => (
        <Text key={`${index}-${line.slice(0, 12)}`} type="body">
          {line || "\u00A0"}
        </Text>
      ))}
    </Stack>
  );
}

function ApprovalCard({
  approval,
  isBusy,
  onDecision,
}: {
  approval: PendingApproval;
  isBusy: boolean;
  onDecision: (decision: "approve" | "reject") => void;
}) {
  const t = useTranslations("Dashboard.assistant");
  const preview = approval.preview;

  return (
    <Card padding={4}>
      <Stack gap={3}>
        <HStack gap={2} align="center">
          <Badge label={t("approval.badge")} variant="orange" />
          <Text type="label">{preview.title}</Text>
        </HStack>
        <Text type="body" color="secondary">
          {preview.summary}
        </Text>
        <Stack gap={1}>
          {preview.facts.map((fact) => (
            <HStack key={`${fact.label}-${fact.value}`} gap={2} justify="between">
              <Text type="supporting" color="secondary">
                {fact.label}
              </Text>
              <Text type="supporting">{fact.value}</Text>
            </HStack>
          ))}
        </Stack>
        {preview.warning ? (
          <Banner status="warning" title={preview.warning} />
        ) : null}
        <HStack gap={2} justify="end">
          <Button
            label={t("approval.reject")}
            variant="secondary"
            size="sm"
            isDisabled={isBusy}
            onClick={() => onDecision("reject")}
          />
          <Button
            label={t("approval.approve")}
            variant="primary"
            size="sm"
            isLoading={isBusy}
            onClick={() => onDecision("approve")}
          />
        </HStack>
      </Stack>
    </Card>
  );
}

export function AssistantDrawer({
  availablePersonas,
}: {
  availablePersonas: AssistantPersona[];
}) {
  const t = useTranslations("Dashboard.assistant");
  const locale = useLocale() === "fr" ? "fr" : "en";
  const [isOpen, setIsOpen] = useState(false);
  const [persona, setPersona] = useState<AssistantPersona>(
    availablePersonas[0] ?? "emma",
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useAssistantMessages();
  const [draft, setDraft] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [busyApproval, setBusyApproval] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const personaDefinition = useMemo(() => PERSONAS[persona], [persona]);

  async function loadConversation(nextPersona: AssistantPersona) {
    setIsLoading(true);
    setError(null);

    try {
      const listResponse = await fetch(
        `/dashboard/assistant/stream?persona=${nextPersona}`,
        {headers: {accept: "application/json"}},
      );
      if (!listResponse.ok) throw new Error(t("errors.load"));

      const list = (await listResponse.json()) as {
        conversations: Array<{id: string}>;
      };
      const latest = list.conversations[0];
      if (!latest) {
        setConversationId(null);
        setMessages([]);
        setApprovals([]);
        return;
      }

      const historyResponse = await fetch(
        `/dashboard/assistant/stream?persona=${nextPersona}&conversationId=${latest.id}`,
        {headers: {accept: "application/json"}},
      );
      if (!historyResponse.ok) throw new Error(t("errors.load"));

      const history = (await historyResponse.json()) as {
        conversation: {id: string};
        messages: AssistantHistoryMessage[];
        pendingApprovals: PendingApproval[];
      };

      setConversationId(history.conversation.id);
      setMessages(history.messages);
      setApprovals(history.pendingApprovals);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("errors.load"));
    } finally {
      setIsLoading(false);
    }
  }

  function appendAssistant(text: string) {
    if (!text.trim()) return;
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        role: "assistant",
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || isStreaming) return;

    setDraft("");
    setError(null);
    setStreamingText("");
    setToolStatus(null);
    setIsStreaming(true);
    setMessages((current) => [
      ...current,
      {
        id: `local-user-${Date.now()}`,
        role: "user",
        text,
        createdAt: new Date().toISOString(),
      },
    ]);

    let finalText = "";
    try {
      const response = await fetch("/dashboard/assistant/stream", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          type: "message",
          persona,
          conversationId: conversationId ?? undefined,
          text,
        }),
      });

      await readEventStream(response, (event) => {
        switch (event.type) {
          case "start":
            setConversationId(event.conversationId);
            break;
          case "text":
            finalText += event.delta;
            setStreamingText((current) => current + event.delta);
            break;
          case "tool":
            setToolStatus(event.phase === "start" ? event.label : null);
            break;
          case "approval":
            setApprovals((current) => [
              ...current.filter((item) => item.id !== event.approvalId),
              {
                id: event.approvalId,
                toolName: event.toolName,
                preview: event.preview,
              },
            ]);
            break;
          case "done":
            appendAssistant(finalText);
            setStreamingText("");
            setToolStatus(null);
            break;
          case "error":
            setError(event.message);
            break;
        }
      });
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : t("errors.send"),
      );
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      setToolStatus(null);
    }
  }

  async function decide(
    approval: PendingApproval,
    decision: "approve" | "reject",
  ) {
    if (!conversationId || busyApproval) return;

    setBusyApproval(approval.id);
    setError(null);
    setStreamingText("");
    setIsStreaming(true);
    let finalText = "";

    try {
      const response = await fetch("/dashboard/assistant/stream", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          type: "approval",
          persona,
          conversationId,
          approvalId: approval.id,
          decision,
        }),
      });

      await readEventStream(response, (event) => {
        switch (event.type) {
          case "text":
            finalText += event.delta;
            setStreamingText((current) => current + event.delta);
            break;
          case "tool":
            setToolStatus(event.phase === "start" ? event.label : null);
            break;
          case "approval":
            setApprovals((current) => [
              ...current.filter((item) => item.id !== event.approvalId),
              {
                id: event.approvalId,
                toolName: event.toolName,
                preview: event.preview,
              },
            ]);
            break;
          case "done":
            appendAssistant(finalText);
            setApprovals((current) =>
              current.filter((item) => item.id !== approval.id),
            );
            setStreamingText("");
            setToolStatus(null);
            break;
          case "error":
            setError(event.message);
            break;
        }
      });
    } catch (decisionError) {
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
    } finally {
      setBusyApproval(null);
      setIsStreaming(false);
      setStreamingText("");
      setToolStatus(null);
    }
  }

  function resetConversation() {
    setConversationId(null);
    setMessages([]);
    setApprovals([]);
    setError(null);
    setStreamingText("");
    setToolStatus(null);
  }

  return (
    <>
      <Button
        label={t("trigger")}
        variant="secondary"
        size="sm"
        icon={<Icon icon={Sparkles} size="sm" />}
        onClick={() => {
          setIsOpen(true);
          void loadConversation(persona);
        }}
      />
      <Drawer
        isOpen={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) void loadConversation(persona);
        }}
        label={t("title")}
        width={460}
        padding={0}
      >
        <Layout
          height="fill"
          header={
            <DrawerHeader
              title={t("title")}
              subtitle={personaDefinition.tagline[locale]}
              onOpenChange={setIsOpen}
            />
          }
          content={
            <LayoutContent isScrollable>
              <Stack gap={4}>
                <HStack gap={2} justify="between" align="center" wrap="wrap">
                  {availablePersonas.length > 1 ? (
                    <SegmentedControl
                      value={persona}
                      onChange={(value) => {
                        const next = value as AssistantPersona;
                        setPersona(next);
                        resetConversation();
                        void loadConversation(next);
                      }}
                      label={t("personaLabel")}
                      size="sm"
                    >
                      {availablePersonas.includes("emma") ? (
                        <SegmentedControlItem value="emma" label="Emma" />
                      ) : null}
                      {availablePersonas.includes("elea") ? (
                        <SegmentedControlItem value="elea" label="Éléa" />
                      ) : null}
                    </SegmentedControl>
                  ) : null}
                  <Button
                    label={t("newChat")}
                    variant="ghost"
                    size="sm"
                    icon={<Icon icon={ArrowLeftRight} size="sm" />}
                    onClick={resetConversation}
                  />
                </HStack>

                <Divider />

                <ChatMessageList
                  isStreaming={isStreaming}
                  density="compact"
                  emptyState={
                    <Card padding={4}>
                      <Stack gap={2}>
                        <Text type="label">{personaDefinition.name}</Text>
                        <Text type="body" color="secondary">
                          {personaDefinition.intro[locale]}
                        </Text>
                        <Text type="supporting" color="secondary">
                          {t("emptyHint")}
                        </Text>
                      </Stack>
                    </Card>
                  }
                >
                  {messages.length > 0 || isStreaming ? (
                    <>
                      {messages.map((message) => (
                        <ChatMessage key={message.id} sender={message.role}>
                          <ChatMessageBubble>
                            <MessageBody text={message.text} />
                          </ChatMessageBubble>
                        </ChatMessage>
                      ))}
                      {isStreaming ? (
                        <ChatMessage sender="assistant">
                          <ChatMessageBubble>
                            <MessageBody
                              text={streamingText || t("thinking")}
                            />
                          </ChatMessageBubble>
                        </ChatMessage>
                      ) : null}
                    </>
                  ) : null}
                </ChatMessageList>

                {toolStatus ? (
                  <Badge label={toolStatus} variant="purple" />
                ) : null}

                {approvals.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    isBusy={busyApproval === approval.id}
                    onDecision={(decision) => void decide(approval, decision)}
                  />
                ))}

                {error ? (
                  <Banner
                    status="error"
                    title={t("errors.title")}
                    description={error}
                  />
                ) : null}
              </Stack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <ChatComposer
                value={draft}
                onChange={setDraft}
                onSubmit={() => void sendMessage()}
                placeholder={t("placeholder", {
                  name: personaDefinition.name,
                })}
                isDisabled={
                  isLoading || isStreaming || approvals.length > 0
                }
                density="compact"
              />
            </LayoutFooter>
          }
        />
      </Drawer>
    </>
  );
}
