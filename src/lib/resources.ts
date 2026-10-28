import {API_SCOPES, OAUTH_STANDARD_SCOPES} from "./scopes";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

function configuredUrl(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

/** Canonical MCP resource (RFC 8707/9728). Tokens are audience-bound to it. */
export const mcpResource = configuredUrl(
  process.env.MCP_RESOURCE_URL,
  `${baseURL}/mcp`,
);

/** Canonical REST API resource. Tokens are audience-bound to it. */
export const apiResource = configuredUrl(
  process.env.API_RESOURCE_URL,
  `${baseURL}/api`,
);

/** Better Auth is the authorization server for both resources. */
export const authIssuer = `${baseURL}/api/auth`;

/** JWKS the resource servers use to verify access tokens locally. */
export const jwksUrl = `${authIssuer}/jwks`;

/** Every scope the provider accepts, including OIDC identity scopes. */
export const providerScopes = [...OAUTH_STANDARD_SCOPES, ...API_SCOPES];

/** Algorithms the provider accepts for DPoP proofs. */
const DPOP_SIGNING_ALGORITHMS = [
  "EdDSA",
  "ES256",
  "ES512",
  "PS256",
  "RS256",
] as const;

/**
 * RFC 9728 document for a protected resource. The MCP document is served by
 * `mcp()`; the API document is served by a route that calls this helper so both
 * stay in sync with the provider configuration.
 */
export function protectedResourceMetadata(resource: string) {
  return {
    resource,
    authorization_servers: [authIssuer],
    bearer_methods_supported: ["header"],
    dpop_signing_alg_values_supported: [...DPOP_SIGNING_ALGORITHMS],
    // Identity scopes belong to the authorization server, not the resource.
    scopes_supported: [...API_SCOPES],
  };
}
