"use client";

import {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import {Avatar} from "@astryxdesign/core/Avatar";
import {Badge} from "@astryxdesign/core/Badge";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatSystemMessage,
  ChatToolCalls,
  type ChatToolCallItem,
} from "@astryxdesign/core/Chat";
import {Dialog, DialogHeader} from "@astryxdesign/core/Dialog";
import {HStack} from "@astryxdesign/core/HStack";
import {Icon} from "@astryxdesign/core/Icon";
import {
  Layout,
  LayoutContent,
} from "@astryxdesign/core/Layout";
import {Markdown} from "@astryxdesign/core/Markdown";
import {ResizeHandle, useResizable} from "@astryxdesign/core/Resizable";
import {Section} from "@astryxdesign/core/Section";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {Stack} from "@astryxdesign/core/Stack";
import {Text} from "@astryxdesign/core/Text";
import {Timestamp} from "@astryxdesign/core/Timestamp";
import {Toolbar} from "@astryxdesign/core/Toolbar";
import {VStack} from "@astryxdesign/core/VStack";
import {ShieldCheck, SquarePen, X} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {
  PERSONAS,
  type AssistantPendingApproval,
  type AssistantPersona,
  type AssistantToolCall,
  type AssistantTurn,
} from "@/lib/assistant";

// Below this width the split pane collapses to a single chat column. The
// container query and the mobile review dialog share the same breakpoint.
const MOBILE_MAX_WIDTH = 767;

const root: CSSProperties = {
  height: "100%",
  width: "100%",
  containerType: "inline-size",
  containerName: "assistant-chat",
};
const chatColumn: CSSProperties = {
  flex: 1,
  width: "100%",
  minWidth: 0,
  height: "100%",
};
const chatLayout: CSSProperties = {
  flex: 1,
  minHeight: 0,
};
const reviewScroll: CSSProperties = {
  flex: 1,
  overflowY: "auto",
};

const reviewPanelWidthVar = (size: number | string): CSSProperties =>
  ({
    "--assistant-review-width":
      typeof size === "number" ? `${size}px` : size,
  }) as CSSProperties;

const CHAT_CSS = `
.assistant-review-resize {
  display: flex;
}
.assistant-review-panel {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: var(--assistant-review-width);
  flex-shrink: 0;
}
@container assistant-chat (max-width: ${MOBILE_MAX_WIDTH}px) {
  .assistant-review-resize {
    display: none;
  }
  .assistant-review-panel {
    display: none;
    width: 100%;
    flex-shrink: 1;
  }
  .assistant-header-tagline,
  .assistant-header-personas {
    display: none;
  }
}
`;

type AssistantChatProps = {
  ref?: Ref<AssistantChatHandle>;
  personas: AssistantPersona[];
  persona: AssistantPersona;
  onPersonaChange: (persona: AssistantPersona) => void;
  turns: AssistantTurn[];
  streamingText: string;
  toolCalls: AssistantToolCall[];
  approvals: AssistantPendingApproval[];
  busyApprovalId: string | null;
  isStreaming: boolean;
  error: string | null;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onNewChat: () => void;
  onDecide: (
    approval: AssistantPendingApproval,
    decision: "approve" | "reject",
  ) => void;
};

export type AssistantChatHandle = {
  openReview: () => void;
};

function toolCallItems(calls: AssistantToolCall[]): ChatToolCallItem[] {
  return calls.map((call) => ({
    key: call.id,
    name: call.label,
    target: call.name,
    status: call.status,
    duration:
      call.durationMs != null ? `${call.durationMs}ms` : undefined,
  }));
}

function ApprovalActions({
  approval,
  isBusy,
  onDecide,
}: {
  approval: AssistantPendingApproval;
  isBusy: boolean;
  onDecide: (
    approval: AssistantPendingApproval,
    decision: "approve" | "reject",
  ) => void;
}) {
  const t = useTranslations("Dashboard.assistant");

  return (
    <HStack gap={2} justify="end">
      <Button
        label={t("approval.reject")}
        variant="secondary"
        size="sm"
        isDisabled={isBusy}
        onClick={() => onDecide(approval, "reject")}
      />
      <Button
        label={t("approval.approve")}
        variant="primary"
        size="sm"
        isLoading={isBusy}
        onClick={() => onDecide(approval, "approve")}
      />
    </HStack>
  );
}

function ApprovalCard({
  approval,
  isBusy,
  onDecide,
}: {
  approval: AssistantPendingApproval;
  isBusy: boolean;
  onDecide: (
    approval: AssistantPendingApproval,
    decision: "approve" | "reject",
  ) => void;
}) {
  const t = useTranslations("Dashboard.assistant");
  const preview = approval.preview;

  return (
    <Card padding={4}>
      <VStack gap={3}>
        <VStack gap={1}>
          <HStack gap={2} align="center">
            <Badge label={t("approval.badge")} variant="orange" />
            <Text type="label">{preview.title}</Text>
          </HStack>
          <Text type="body" color="secondary">
            {preview.summary}
          </Text>
        </VStack>

        <Stack gap={1}>
          {preview.facts.map((fact) => (
            <HStack
              key={`${fact.label}-${fact.value}`}
              gap={2}
              justify="between"
            >
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

        {preview.href ? (
          <Button
            label={t("review.openRecord")}
            variant="ghost"
            size="sm"
            href={preview.href}
          />
        ) : null}

        <ApprovalActions
          approval={approval}
          isBusy={isBusy}
          onDecide={onDecide}
        />
      </VStack>
    </Card>
  );
}

function ApprovalList({
  approvals,
  busyApprovalId,
  onDecide,
}: {
  approvals: AssistantPendingApproval[];
  busyApprovalId: string | null;
  onDecide: (
    approval: AssistantPendingApproval,
    decision: "approve" | "reject",
  ) => void;
}) {
  return (
    <VStack gap={4}>
      {approvals.map((approval) => (
        <ApprovalCard
          key={approval.id}
          approval={approval}
          isBusy={busyApprovalId === approval.id}
          onDecide={onDecide}
        />
      ))}
    </VStack>
  );
}

function MessageTurn({
  turn,
  defaultPersona,
}: {
  turn: AssistantTurn;
  defaultPersona: AssistantPersona;
}) {
  const t = useTranslations("Dashboard.assistant");

  if (turn.role === "system") {
    return (
      <ChatSystemMessage variant="divider">{turn.text}</ChatSystemMessage>
    );
  }

  const isAssistant = turn.role === "assistant";
  const persona = turn.persona ?? defaultPersona;
  const personaName = PERSONAS[persona].name;

  return (
    <ChatMessage
      sender={turn.role}
      avatar={
        isAssistant ? <Avatar name={personaName} size="md" /> : undefined
      }
      metadata={
        <ChatMessageMetadata
          timestamp={<Timestamp value={turn.createdAt} format="time" />}
        />
      }
    >
      <ChatMessageBubble variant={isAssistant ? "ghost" : "filled"}>
        {isAssistant ? (
          <Markdown density="compact">{turn.text}</Markdown>
        ) : (
          <Text type="body">{turn.text}</Text>
        )}
      </ChatMessageBubble>
      {turn.toolCalls && turn.toolCalls.length > 0 ? (
        <ChatToolCalls
          calls={toolCallItems(turn.toolCalls)}
          label={t("tools.used")}
        />
      ) : null}
    </ChatMessage>
  );
}

export function AssistantChat({
  ref,
  personas,
  persona,
  onPersonaChange,
  turns,
  streamingText,
  toolCalls,
  approvals,
  busyApprovalId,
  isStreaming,
  error,
  draft,
  onDraftChange,
  onSubmit,
  onNewChat,
  onDecide,
}: AssistantChatProps) {
  const t = useTranslations("Dashboard.assistant");
  const locale = useLocale() === "fr" ? "fr" : "en";
  const personaDefinition = PERSONAS[persona];
  const rootRef = useRef<HTMLElement>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isMobileReviewOpen, setIsMobileReviewOpen] = useState(false);
  const reviewResize = useResizable({
    defaultSize: 420,
    minSize: 320,
    maxSize: 560,
    autoSaveId: "assistant-review-panel",
  });
  const hasApprovals = approvals.length > 0;

  const openReview = useCallback(() => {
    const width = rootRef.current?.offsetWidth ?? window.innerWidth;
    if (width <= MOBILE_MAX_WIDTH) {
      setIsMobileReviewOpen(true);
    } else {
      setIsReviewOpen(true);
    }
  }, []);

  useImperativeHandle(ref, () => ({openReview}), [openReview]);

  return (
    <VStack ref={rootRef} style={root}>
      <style>{CHAT_CSS}</style>
      <Layout
        height="fill"
        header={
          <Toolbar
            label={t("title")}
            dividers={["bottom"]}
            startContent={
              <HStack gap={3} vAlign="center">
                <Avatar name={personaDefinition.name} size="sm" />
                <VStack gap={0}>
                  <Text type="label" weight="semibold">
                    {personaDefinition.name}
                  </Text>
                  <Text
                    type="supporting"
                    color="secondary"
                    className="assistant-header-tagline"
                  >
                    {personaDefinition.tagline[locale]}
                  </Text>
                </VStack>
              </HStack>
            }
            endContent={
              <HStack gap={2} vAlign="center">
                {personas.length > 1 ? (
                  <SegmentedControl
                    value={persona}
                    onChange={(value) =>
                      onPersonaChange(value as AssistantPersona)
                    }
                    label={t("personaLabel")}
                    size="sm"
                    className="assistant-header-personas"
                  >
                    {personas.includes("emma") ? (
                      <SegmentedControlItem value="emma" label="Emma" />
                    ) : null}
                    {personas.includes("elea") ? (
                      <SegmentedControlItem value="elea" label="Éléa" />
                    ) : null}
                  </SegmentedControl>
                ) : null}
                {hasApprovals ? (
                  <HStack gap={1} vAlign="center">
                    <Button
                      label={t("review.open")}
                      variant="secondary"
                      size="sm"
                      icon={<Icon icon={ShieldCheck} size="sm" />}
                      onClick={openReview}
                    />
                    <Badge
                      label={String(approvals.length)}
                      variant="orange"
                    />
                  </HStack>
                ) : null}
                <Button
                  label={t("newChat")}
                  variant="ghost"
                  size="sm"
                  icon={<Icon icon={SquarePen} size="sm" />}
                  onClick={onNewChat}
                />
              </HStack>
            }
          />
        }
        content={
          <LayoutContent padding={0}>
            <HStack height="100%">
              {/* Chat column — flexes to fill the space the review panel leaves */}
              <VStack style={chatColumn}>
                <ChatLayout
                  density="spacious"
                  style={chatLayout}
                  composer={
                    <ChatComposer
                      value={draft}
                      onChange={onDraftChange}
                      onSubmit={onSubmit}
                      placeholder={t("placeholder", {
                        name: personaDefinition.name,
                      })}
                      isDisabled={
                        isStreaming || hasApprovals
                      }
                      status={
                        error ? {type: "error", message: error} : undefined
                      }
                    />
                  }
                >
                  <ChatMessageList density="spacious">
                    {turns.map((turn) => (
                      <MessageTurn
                        key={turn.id}
                        turn={turn}
                        defaultPersona={persona}
                      />
                    ))}

                    {isStreaming ? (
                      <ChatMessage
                        sender="assistant"
                        avatar={
                          <Avatar name={personaDefinition.name} size="md" />
                        }
                      >
                        <ChatMessageBubble variant="ghost">
                          {streamingText ? (
                            <Markdown density="compact">
                              {streamingText}
                            </Markdown>
                          ) : (
                            <Text type="body" color="secondary">
                              {t("thinking")}
                            </Text>
                          )}
                        </ChatMessageBubble>
                        {toolCalls.length > 0 ? (
                          <ChatToolCalls
                            defaultIsExpanded
                            calls={toolCallItems(toolCalls)}
                            label={t("tools.running")}
                          />
                        ) : null}
                      </ChatMessage>
                    ) : null}
                  </ChatMessageList>
                </ChatLayout>
              </VStack>

              {/* Desktop split pane: resize handle + approvals */}
              {isReviewOpen && hasApprovals ? (
                <>
                  <ResizeHandle
                    direction="horizontal"
                    resizable={reviewResize.props}
                    isReversed
                    pillPlacement="start"
                    hasDivider
                    label={t("review.resize")}
                    className="assistant-review-resize"
                  />
                  <Card
                    variant="transparent"
                    height="100%"
                    className="assistant-review-panel"
                    style={reviewPanelWidthVar(reviewResize.size)}
                  >
                    <Toolbar
                      label={t("review.title")}
                      dividers={["bottom"]}
                      startContent={
                        <HStack gap={2} vAlign="center">
                          <Icon
                            icon={ShieldCheck}
                            size="sm"
                            color="secondary"
                          />
                          <VStack gap={0}>
                            <Text type="label" weight="semibold" as="h2">
                              {t("review.title")}
                            </Text>
                            <Text type="supporting" color="secondary">
                              {t("review.count", {
                                count: approvals.length,
                              })}
                            </Text>
                          </VStack>
                        </HStack>
                      }
                      endContent={
                        <Button
                          label={t("review.close")}
                          variant="ghost"
                          size="sm"
                          icon={<Icon icon={X} size="sm" />}
                          isIconOnly
                          onClick={() => setIsReviewOpen(false)}
                        />
                      }
                    />
                    <Section variant="transparent" style={reviewScroll}>
                      <VStack gap={4} padding={4}>
                        <ApprovalList
                          approvals={approvals}
                          busyApprovalId={busyApprovalId}
                          onDecide={onDecide}
                        />
                      </VStack>
                    </Section>
                  </Card>
                </>
              ) : null}
            </HStack>
          </LayoutContent>
        }
      />

      {/* Mobile review view — full-screen Dialog */}
      <Dialog
        isOpen={isMobileReviewOpen && hasApprovals}
        onOpenChange={setIsMobileReviewOpen}
        purpose="info"
        variant="fullscreen"
      >
        <Layout
          header={
            <DialogHeader
              title={t("review.title")}
              subtitle={t("review.count", {count: approvals.length})}
              hasDivider
              onOpenChange={setIsMobileReviewOpen}
            />
          }
          content={
            <LayoutContent>
              <ApprovalList
                approvals={approvals}
                busyApprovalId={busyApprovalId}
                onDecide={onDecide}
              />
            </LayoutContent>
          }
        />
      </Dialog>
    </VStack>
  );
}
