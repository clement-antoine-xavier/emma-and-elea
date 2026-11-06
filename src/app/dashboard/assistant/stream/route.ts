import {TypeValidationError} from "ai";
import {cookies} from "next/headers";
import {z} from "zod";
import {localeCookieName, resolveLocale} from "@/i18n/locale";
import {appBaseUrl} from "@/lib/app-url";
import {parsePersona} from "@/server/agents/context";
import {getAssistantConfig} from "@/server/agents/config";
import {
  getConversationHistory,
  listConversations,
  streamAssistantResponse,
} from "@/server/agents/runner";
import {getActorContext} from "@/server/auth/actor";
import {assertOrganizationActor} from "@/server/auth/guards";
import type {OrganizationActor} from "@/server/auth/types";
import {DomainError, isDomainError} from "@/server/domain/errors";
import type {AssistantUIMessage} from "@/lib/assistant";

// Fluid compute allows long streaming runs; the platform clamps this to the
// plan's maximum.
export const maxDuration = 300;

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(120),
  persona: z.enum(["emma", "elea"]),
  conversationId: z.string().trim().min(1).optional(),
});

function json(status: number, body: unknown): Response {
  return Response.json(body, {status});
}

async function resolveActor(): Promise<OrganizationActor | Response> {
  const actor = await getActorContext();
  if (!actor) return json(401, {error: "UNAUTHENTICATED"});

  try {
    return assertOrganizationActor(actor);
  } catch (error) {
    return json(403, {
      error: isDomainError(error) ? error.message : "FORBIDDEN",
    });
  }
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const configured = appBaseUrl();

  try {
    return new URL(origin).origin === new URL(configured).origin;
  } catch {
    return false;
  }
}

function errorStatus(error: DomainError): number {
  if (error.message === "ASSISTANT_RATE_LIMITED") return 429;
  if (error.message === "ASSISTANT_BUDGET_EXCEEDED") return 429;

  switch (error.code) {
    case "NOT_FOUND":
      return 404;
    case "INVALID_INPUT":
      return 400;
    case "FORBIDDEN":
      return 403;
    case "CONFLICT":
      return 409;
    default:
      return 500;
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return json(403, {error: "FORBIDDEN"});

  const actor = await resolveActor();
  if (actor instanceof Response) return actor;

  const params = new URL(request.url).searchParams;
  const persona = parsePersona(params.get("persona"));
  if (!persona) return json(400, {error: "INVALID_PERSONA"});

  const conversationId = params.get("conversationId");
  if (conversationId) {
    const history = await getConversationHistory(actor, conversationId);
    if (!history) return json(404, {error: "CONVERSATION_NOT_FOUND"});

    return json(200, history);
  }

  return json(200, {
    conversations: await listConversations(actor, persona),
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return json(403, {error: "FORBIDDEN"});

  const actor = await resolveActor();
  if (actor instanceof Response) return actor;

  try {
    if (!getAssistantConfig()) {
      return json(404, {error: "ASSISTANT_DISABLED"});
    }
  } catch {
    return json(503, {error: "ASSISTANT_NOT_CONFIGURED"});
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(400, {error: "INVALID_JSON"});
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return json(400, {error: "INVALID_REQUEST"});
  }

  const locale = resolveLocale((await cookies()).get(localeCookieName)?.value);

  try {
    return await streamAssistantResponse({
      actor,
      locale,
      request: {
        ...parsed.data,
        messages: parsed.data.messages as AssistantUIMessage[],
      },
      abortSignal: request.signal,
    });
  } catch (error) {
    if (error instanceof TypeValidationError) {
      return json(400, {error: "INVALID_MESSAGES"});
    }

    if (isDomainError(error)) {
      return json(errorStatus(error), {error: error.message});
    }

    console.error("Assistant request failed", error);
    return json(500, {error: "UNEXPECTED"});
  }
}
