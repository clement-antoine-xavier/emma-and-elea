import {createMcpHandler} from "@modelcontextprotocol/server";
import {requireMcpAuth} from "@better-auth/mcp";
import {auth} from "@/lib/auth";
import {mcpResource} from "@/lib/resources";
import {resolveTokenActor, scopesFromClaim} from "@/server/auth/token-actor";
import {isDomainError} from "@/server/domain/errors";
import type {OrganizationActor} from "@/server/auth/types";
import {mcpDeps} from "./deps";
import {createMcpServer} from "./server";

const handler = createMcpHandler(
  ({authInfo}) => {
    const actor = authInfo?.extra?.actor as OrganizationActor | undefined;

    if (!actor) {
      throw new Error("MCP request is missing its resolved actor.");
    }

    return createMcpServer(actor, mcpDeps);
  },
  // MCP 2026-07-28 is stateless: every exchange is an independent POST.
  // Older session-oriented clients are rejected rather than half-served.
  {legacy: "reject"},
);

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "");
}

const ACTOR_ERRORS: Record<string, string> = {
  TOKEN_USER_REQUIRED: "The access token is not bound to a user.",
  TOKEN_ORGANIZATION_REQUIRED:
    "No workspace is bound to this authorization. Choose a workspace in the app, then connect again.",
  TOKEN_MEMBERSHIP_REQUIRED:
    "You are no longer a member of the workspace this token was granted for.",
  TOKEN_UNKNOWN_ROLE: "Your role in this workspace is not supported.",
};

function forbiddenResponse(code: string): Response {
  return Response.json(
    {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32001,
        message: ACTOR_ERRORS[code] ?? "Forbidden",
        data: {code},
      },
    },
    {status: 403},
  );
}

/**
 * Protected MCP entry point. `requireMcpAuth` verifies the access token against
 * the auth server's JWKS (signature, issuer, audience, expiry) and answers
 * unauthenticated requests with the RFC 9728 challenge that starts discovery.
 * The organization comes from the consent-bound claim, never from a tool
 * argument.
 */
export const mcpHandler = requireMcpAuth(
  auth,
  async (request, claims) => {
    let actor: OrganizationActor;

    try {
      actor = await resolveTokenActor(claims);
    } catch (error) {
      return forbiddenResponse(
        isDomainError(error) ? error.message : "UNEXPECTED",
      );
    }

    const token = bearerToken(request);

    return handler.fetch(request, {
      authInfo: {
        token,
        clientId:
          (typeof claims.client_id === "string" && claims.client_id) ||
          (typeof claims.azp === "string" && claims.azp) ||
          "unknown",
        scopes: scopesFromClaim(claims.scope),
        expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
        resource: new URL(mcpResource),
        extra: {actor},
      },
    });
  },
  {
    resource: mcpResource,
    // Advertised on the initial 401. Higher-risk scopes are requested through
    // the per-tool step-up challenge instead.
    challengeScopes: ["api:read", "api:write"],
  },
);
