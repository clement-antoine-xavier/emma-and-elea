# 0021. Expose a REST API as a second OAuth resource

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-27

## Context and Problem Statement

ADR-0020 gave MCP an OAuth 2.1 authorization server and audience-bound access
tokens. Integrations now also need plain HTTP endpoints under `/api`, and the
MCP endpoint should read as a first-class surface rather than living inside the
API namespace. Both must share one identity, one tenant model and one consent
experience without turning Server Actions or Server Components into token
consumers.

How do we add a REST API next to MCP without a second authorization system, and
how do tokens for one surface stay unusable on the other?

## Decision Drivers

- Least privilege between surfaces: an MCP host should not automatically call the
  public API, and an API client should not reach MCP tools.
- One scope vocabulary and one permission matrix for every credential.
- Tenant isolation and immediate role revocation, as in ADR-0020.
- Local JWT verification on every request; no introspection round trip.
- The browser keeps using the session cookie.

## Considered Options

- One shared resource (`/api`) covering both MCP and REST routes
- Two resources (`/mcp` and `/api`) with a shared scope vocabulary
- OAuth bearer tokens on Server Actions and Server Components as well
- Separate API-key authentication for the REST surface

## Decision Outcome

Chosen option: "Two resources (`/mcp` and `/api`) with a shared scope vocabulary".

- `MCP_RESOURCE_URL` defaults to `${BETTER_AUTH_URL}/mcp`; `API_RESOURCE_URL`
  defaults to `${BETTER_AUTH_URL}/api`. Both are registered in `mcp()` with the
  same `allowedScopes`, so one authorization server issues tokens for either.
- Scopes are resource-neutral: `api:read`, `api:write`, `api:execute`,
  `api:finance`. `src/lib/scopes.ts` maps them to permissions; the names no
  longer claim to be MCP-specific.
- A token is bound to one audience. `/api` verifies with
  `verifyAccessTokenRequest` and `audience: API_RESOURCE_URL`; `/mcp` keeps
  `requireMcpAuth`. A token minted for one is `401 invalid_token` at the other.
- `src/server/auth/token-actor.ts` is shared: the organization comes from the
  consent-bound claim, the role is re-read from the database, and the effective
  permissions are `token scopes ∩ role`.
- `src/server/api/respond.ts` maps `DomainError` to HTTP statuses, so REST
  handlers keep the layered entry point → service pattern.
- `/api` is served by a dedicated RFC 9728 document built from
  `src/lib/resources.ts`; the MCP document keeps coming from `mcp()`.

The first slice exposes read routes (`/api/me`, sites, catalog, customers, stock,
production, orders, dispatches, reports) and writes for catalog items, categories
and customers. The remaining write routes reuse the same verifier, schemas and
service methods with the `api:write` / `api:execute` scopes.

### Positive Consequences

- One authorization server, one consent screen and one scope vocabulary.
- Cross-surface token replay is rejected by the audience check.
- A future machine client can use `client_credentials` against `/api` without
  changing the MCP setup.
- Services and the role matrix are untouched; only the entry points differ.

### Negative Consequences

- Two resources mean two tokens when a client needs both surfaces.
- The REST surface duplicates the MCP adapters; both must track service
  signature changes.
- `/api` as an audience also contains `/api/auth`; only the resource routes are
  guarded, so future public routes must be added deliberately.
- No CORS or per-IP rate limiting yet. Both are required before a browser or
  untrusted third party calls the API.

## Pros and Cons of the Options

### One shared resource

- Good: one consent and one token for both surfaces.
- Bad: a host token can call the API and vice versa, which weakens least
  privilege for no functional gain.

### Two resources with shared scopes

- Good: audience isolation with a single vocabulary; MCP and API clients each
  request what they need.
- Bad: two registrations/consents for a client that needs both.

### OAuth tokens on Server Actions and Components

- Good: one credential everywhere.
- Bad: the browser session would need token issuance, refresh and CSRF handling
  with no security benefit.

### API keys only

- Good: simple for machine clients.
- Bad: a second identity system, no user delegation, no consent, and no tenant
  claim unless we invent one.

## Links

- ADR-0020 (MCP authorization server and resource server)
- ADR-0011 (role matrix), ADR-0012 (layering)
- [RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728), [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750)
