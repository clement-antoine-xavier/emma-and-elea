import type {Metadata} from "next";
import {Suspense} from "react";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {AssistantLoading} from "@/components/assistant/assistant-loading";
import {AssistantWorkspace} from "@/components/assistant/assistant-workspace";
import {availableAssistantPersonas} from "@/server/agents/access";
import {requireOrganizationActor} from "@/server/auth/actor";
import {assistantService} from "@/server/services/container";

type AssistantConversationPageProps = {
  params: Promise<{conversationId: string}>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.assistant");

  return {title: t("metadataTitle")};
}

export default function AssistantConversationPage({
  params,
}: AssistantConversationPageProps) {
  return (
    <Suspense fallback={<AssistantLoading />}>
      <AssistantConversation params={params} />
    </Suspense>
  );
}

async function AssistantConversation({
  params,
}: AssistantConversationPageProps) {
  const {conversationId} = await params;
  const actor = await requireOrganizationActor();
  const personas = availableAssistantPersonas(actor);

  if (personas.length === 0) notFound();

  const history = await assistantService.getConversation(
    actor,
    conversationId,
  );

  if (!history) notFound();

  return (
    <AssistantWorkspace
      key={history.conversation.id}
      personas={personas}
      memberName={actor.name.trim().split(/\s+/)[0] || actor.name}
      initialConversationId={history.conversation.id}
      initialPersona={history.conversation.persona}
      initialMessages={history.messages}
      initialApprovals={history.pendingApprovals}
    />
  );
}
