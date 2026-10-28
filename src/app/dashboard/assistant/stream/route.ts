import {cookies} from "next/headers";
import {z} from "zod";
import {localeCookieName, resolveLocale} from "@/i18n/locale";
import {parsePersona} from "@/server/agents/context";
import {getAssistantConfig} from "@/server/agents/config";
import {allowAssistantRequest} from "@/server/agents/rate-limit";
import {
  getConversationHistory,
  listConversations,
  streamAssistant,
} from "@/server/agents/runner";
import {getActorContext} from "@/server/auth/actor";
import {assertOrganizationActor} from "@/server/auth/guards";
import type {OrganizationActor} from "@/server/auth/types";
import {isDomainError} from "@/server/domain/errors";
import type {AssistantStreamEvent} from "@/lib/assistant";

const messageSchema = z.object({
  type: z.literal("message"),
  persona: z.enum(["emma", "elea"]),
  conversationId: z.string().trim().min(1).optional(),
  text: z.string().trim().min(1).max(4000),
});

const approvalSchema = z.object({
  type: z.literal("approval"),
  persona: z.enum(["emma", "elea"]),
  conversationId: z.string().trim().min(1),
  approvalId: z.string().trim().min(1),
  decision: z.enum(["approve", "reject"]),
});

const requestSchema = z.discriminatedUnion("type", [
  messageSchema,
  approvalSchema,
]);

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

  const configured = process.env.BETTER_AUTH_URL;
  if (!configured) return true;

  try {
    return new URL(origin).origin === new URL(configured).origin;
  } catch {
    return false;
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

  if (!allowAssistantRequest(actor.userId)) {
    return json(429, {error: "ASSISTANT_RATE_LIMITED"});
  }

  let config: ReturnType<typeof getAssistantConfig> = null;
  try {
    config = getAssistantConfig();
  } catch {
    return json(503, {error: "ASSISTANT_NOT_CONFIGURED"});
  }

  if (!config) {
    return json(404, {error: "ASSISTANT_DISABLED"});
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(400, {error: "INVALID_JSON"});
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return json(400, {error: "INVALID_REQUEST"});
  }

  const locale = resolveLocale(
    (await cookies()).get(localeCookieName)?.value,
  );
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AssistantStreamEvent) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
          ),
        );
      };

      try {
        for await (const event of streamAssistant({
          actor,
          locale,
          request: parsed.data,
        })) {
          send(event);
        }
      } catch (error) {
        send({
          type: "error",
          code: isDomainError(error)
            ? error.code
            : error instanceof Error
              ? error.message
              : "UNEXPECTED",
          message:
            locale === "fr"
              ? "L’assistant n’a pas pu terminer cette demande."
              : "The assistant could not complete this request.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
