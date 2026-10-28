import type {Locale} from "@/i18n/routing";
import type {Permission} from "@/lib/permissions";
import {isGranted} from "@/server/auth/guards";
import type {OrganizationActor} from "@/server/auth/types";

export type AssistantPersona = "emma" | "elea";

export type AssistantContext = {
  actor: OrganizationActor;
  persona: AssistantPersona;
  locale: Locale;
  conversationId: string;
  runId: string;
  can: (permission: Permission) => boolean;
};

export function buildAssistantContext(input: {
  actor: OrganizationActor;
  persona: AssistantPersona;
  locale: Locale;
  conversationId: string;
  runId: string;
}): AssistantContext {
  return {
    ...input,
    can: (permission) => isGranted(input.actor, permission),
  };
}

export function personaEnum(persona: AssistantPersona): "EMMA" | "ELEA" {
  return persona === "emma" ? "EMMA" : "ELEA";
}

export function parsePersona(value: unknown): AssistantPersona | null {
  return value === "emma" || value === "elea" ? value : null;
}
