import {
  createDpopReplayStore,
  requestToResourceInput,
  verifyAccessTokenRequest,
} from "better-auth/oauth2";
import {createResourceServerChallenge} from "@better-auth/oauth-provider";
import {auth} from "@/lib/auth";
import {apiResource, authIssuer, jwksUrl} from "@/lib/resources";
import type {ApiScope} from "@/lib/scopes";
import type {OrganizationActor} from "@/server/auth/types";
import {
  resolveTokenActor,
  type TokenClaims,
} from "@/server/auth/token-actor";
import {domainErrorResponse, jsonError} from "./respond";

export type ApiCaller = {
  actor: OrganizationActor;
  claims: TokenClaims;
};

/**
 * Verifies a bearer token for the REST API resource and resolves the tenant
 * actor. Returns a ready `Response` for the two failure families:
 *
 * - missing, invalid, expired or wrong-audience token -> RFC 6750 `401`
 * - token missing a required scope -> `403 insufficient_scope`
 *
 * A valid token whose user is no longer a member is a plain `403`.
 */
export async function authenticateApiRequest(
  request: Request,
  requiredScopes: readonly ApiScope[] = [],
): Promise<ApiCaller | Response> {
  const {internalAdapter} = await auth.$context;
  let claims: TokenClaims;

  try {
    claims = await verifyAccessTokenRequest(requestToResourceInput(request), {
      verifyOptions: {issuer: authIssuer, audience: apiResource},
      jwksUrl,
      requiredScopes,
      dpop: {replayStore: createDpopReplayStore(internalAdapter)},
    });
  } catch (error) {
    return challengeResponse(error);
  }

  try {
    const actor = await resolveTokenActor(claims);
    return {actor, claims};
  } catch (error) {
    return domainErrorResponse(error);
  }
}

function challengeResponse(error: unknown): Response {
  const challenge = createResourceServerChallenge(error, apiResource, {
    challengeScopes: ["api:read"],
  });

  if (!challenge) {
    return jsonError(500, "UNEXPECTED", "The token could not be verified.");
  }

  const headers = new Headers(challenge.headers);
  headers.set("content-type", "application/json");

  return new Response(
    JSON.stringify({
      error:
        challenge.status === "FORBIDDEN"
          ? "insufficient_scope"
          : "invalid_token",
      error_description: challenge.message,
    }),
    {status: challenge.statusCode, headers},
  );
}

/** Narrowing helper: a `Response` means the request was rejected. */
export function isResponse(value: ApiCaller | Response): value is Response {
  return value instanceof Response;
}
