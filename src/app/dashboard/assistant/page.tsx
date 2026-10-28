import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {AssistantWorkspace} from "@/components/assistant/assistant-workspace";
import {availableAssistantPersonas} from "@/server/agents/access";
import {requireOrganizationActor} from "@/server/auth/actor";
import {assistantService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.assistant");

  return {title: t("metadataTitle")};
}

type AssistantPageProps = {
  searchParams: Promise<{persona?: string | string[]}>;
};

export default async function AssistantPage({
  searchParams,
}: AssistantPageProps) {
  const actor = await requireOrganizationActor();
  const personas = availableAssistantPersonas(actor);

  if (personas.length === 0) notFound();

  const params = await searchParams;
  const requested = Array.isArray(params.persona)
    ? params.persona[0]
    : params.persona;
  const initialPersona =
    (requested === "emma" || requested === "elea") &&
    personas.includes(requested)
      ? requested
      : personas[0];
  const recent = await assistantService.listConversations(
    actor,
    initialPersona,
  );

  return (
    <AssistantWorkspace
      personas={personas}
      memberName={actor.name.trim().split(/\s+/)[0] || actor.name}
      initialPersona={initialPersona}
      initialRecent={recent.slice(0, 5)}
    />
  );
}
