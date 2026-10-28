import type {AssistantPersona} from "@/lib/assistant";
import {personaHasDomainTools} from "@/server/agents/capabilities/catalog";
import {isAssistantEnabled} from "@/server/agents/config";
import {isGranted} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";

const PERSONA_ORDER = ["emma", "elea"] as const;

/**
 * Personas the member can actually use. The dashboard rail, the zero-state
 * page and the conversation page all read this so the entry points cannot
 * drift from the capability catalogue.
 */
export function availableAssistantPersonas(actor: Actor): AssistantPersona[] {
  if (!isAssistantEnabled()) return [];

  return PERSONA_ORDER.filter((persona) =>
    personaHasDomainTools(persona, (permission) => isGranted(actor, permission)),
  );
}
