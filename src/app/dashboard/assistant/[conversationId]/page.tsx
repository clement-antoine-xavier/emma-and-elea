import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {AssistantWorkspace} from "@/components/assistant/assistant-workspace";
import {availableAssistantPersonas} from "@/server/agents/access";
import {requireOrganizationActor} from "@/server/auth/actor";
import {assistantService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type AssistantConversationPageProps = {
  params: Promise<{conversationId: string}>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.assistant");

  return {title: t("metadataTitle")};
}

export default async function AssistantConversationPage({
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
      personas={personas}
      memberName={actor.name.trim().split(/\s+/)[0] || actor.name}
      initialConversationId={history.conversation.id}
      initialPersona={history.conversation.persona}
      initialTurns={history.messages.map((message) => ({
        ...message,
        persona: history.conversation.persona,
      }))}
      initialApprovals={history.pendingApprovals}
    />
  );
}
