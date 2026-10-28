"use client";

import type {CSSProperties} from "react";
import {ClickableCard} from "@astryxdesign/core/ClickableCard";
import {Grid} from "@astryxdesign/core/Grid";
import {Heading} from "@astryxdesign/core/Heading";
import {HStack} from "@astryxdesign/core/HStack";
import {Icon} from "@astryxdesign/core/Icon";
import {Layout, LayoutContent} from "@astryxdesign/core/Layout";
import {List, ListItem} from "@astryxdesign/core/List";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {Text} from "@astryxdesign/core/Text";
import {Timestamp} from "@astryxdesign/core/Timestamp";
import {VStack} from "@astryxdesign/core/VStack";
import {ChatComposer} from "@astryxdesign/core/Chat";
import {ChevronRight, Sparkles} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {
  PERSONAS,
  PERSONA_SUGGESTIONS,
  type AssistantConversationSummary,
  type AssistantPersona,
} from "@/lib/assistant";

const pageStyle: CSSProperties = {minHeight: "100%"};

type AssistantLandingProps = {
  personas: AssistantPersona[];
  persona: AssistantPersona;
  onPersonaChange: (persona: AssistantPersona) => void;
  memberName: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (value: string) => void;
  recent: AssistantConversationSummary[];
  isSending: boolean;
  error: string | null;
};

export function AssistantLanding({
  personas,
  persona,
  onPersonaChange,
  memberName,
  draft,
  onDraftChange,
  onSubmit,
  recent,
  isSending,
  error,
}: AssistantLandingProps) {
  const t = useTranslations("Dashboard.assistant");
  const locale = useLocale() === "fr" ? "fr" : "en";
  const personaDefinition = PERSONAS[persona];
  const suggestions = PERSONA_SUGGESTIONS[persona];

  return (
    <Layout
      height="fill"
      contentWidth={720}
      padding={6}
      content={
        <LayoutContent>
          <VStack gap={8} vAlign="center" style={pageStyle}>
            <VStack gap={1} hAlign="center">
              <HStack gap={2} vAlign="center">
                <Icon icon={Sparkles} size="md" color="accent" />
                <Text type="large" as="h2">
                  {t("landing.greeting", {name: memberName})}
                </Text>
              </HStack>
              <Text type="display-2" as="h1">
                {t("landing.title")}
              </Text>
              <Text type="body" color="secondary">
                {personaDefinition.intro[locale]}
              </Text>
            </VStack>

            <ChatComposer
              value={draft}
              onChange={onDraftChange}
              onSubmit={onSubmit}
              placeholder={t("placeholder", {name: personaDefinition.name})}
              isDisabled={isSending}
              status={error ? {type: "error", message: error} : undefined}
              footerActions={
                personas.length > 1 ? (
                  <SegmentedControl
                    value={persona}
                    onChange={(value) =>
                      onPersonaChange(value as AssistantPersona)
                    }
                    label={t("personaLabel")}
                  >
                    {personas.includes("emma") ? (
                      <SegmentedControlItem value="emma" label="Emma" />
                    ) : null}
                    {personas.includes("elea") ? (
                      <SegmentedControlItem value="elea" label="Éléa" />
                    ) : null}
                  </SegmentedControl>
                ) : undefined
              }
            />

            <VStack gap={4} width="100%">
              <Text type="label">{t("landing.suggestions")}</Text>
              <Grid columns={{minWidth: 280}} gap={3}>
                {suggestions.map((suggestion) => (
                  <ClickableCard
                    key={suggestion.id}
                    label={suggestion.title[locale]}
                    variant="muted"
                    padding={3}
                    onClick={() => onDraftChange(suggestion.prompt[locale])}
                  >
                    <VStack gap={0.5}>
                      <Heading level={4}>{suggestion.title[locale]}</Heading>
                      <Text type="body" color="secondary" size="xsm">
                        {suggestion.description[locale]}
                      </Text>
                    </VStack>
                  </ClickableCard>
                ))}
              </Grid>
            </VStack>

            {recent.length > 0 ? (
              <VStack gap={2} width="100%">
                <Text type="label">{t("landing.recent")}</Text>
                <List hasDividers density="compact">
                  {recent.map((conversation) => (
                    <ListItem
                      key={conversation.id}
                      label={conversation.title ?? t("landing.untitled")}
                      description={
                        <Timestamp
                          value={conversation.updatedAt}
                          format="relative"
                        />
                      }
                      href={`/dashboard/assistant/${conversation.id}`}
                      endContent={
                        <Icon
                          icon={ChevronRight}
                          size="sm"
                          color="secondary"
                        />
                      }
                    />
                  ))}
                </List>
              </VStack>
            ) : null}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
