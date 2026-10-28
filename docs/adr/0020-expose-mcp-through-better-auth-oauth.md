# 0020. Expose MCP through Better Auth OAuth

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-27

## Context and Problem Statement

AI hosts (Claude Code, Cursor, MCP Inspector) should be able to read and operate
the same domain the dashboard exposes: catalog, purchasing, stock, production,
planning, sales, dispatch and reports. MCP requires an OAuth 2.1 authorization
server, a protected-resource identity, consent, token issuance and tenant
scoping. The app already has Better Auth with organization memberships and a
fine-grained role matrix.

How do we expose an MCP server without creating a second permission system, a
second tenant model, or a bearer-token path into the browser surfaces?

## Decision Drivers

- One vocabulary: a permission must mean the same thing to a page, a Server
  Action and an MCP tool.
- Tenant isolation: a token must never reach another organization.
- Revocation: removing a member or changing a role must take effect quickly,
  even though a JWT cannot be revoked individually.
- Compatibility with shipped MCP clients (Cursor, Claude Code) and the
  spec-preferred CIMD flow.
- No new infrastructure: no Redis, no separate auth service.

## Considered Options

- Hand-roll the OAuth provider and authorization-server endpoints
- Use `@better-auth/mcp` on top of the existing Better Auth instance
- Reuse session cookies for an MCP endpoint (no OAuth)
- Put OAuth bearer tokens in front of Server Actions and Server Components too

## Decision Outcome

Chosen option: "Use `@better-auth/mcp` on top of the existing Better Auth
instance", composed with the official MCP TypeScript SDK v2 for the transport.

- `jwt()` provides the signing key and `/jwks`.
- `mcp({ resource })` serves the OAuth endpoints, RFC 8414 metadata and the RFC
  9728 protected-resource metadata, and binds tokens to the MCP resource.
- `cimd()` with `metadataProfile: "mcp-2026-07-28"` adds Client ID Metadata
  Documents; Dynamic Client Registration stays enabled as a compatibility
  fallback for clients that only implement DCR.
- `src/app/mcp/route.ts` exports `POST` only and delegates to
  `requireMcpAuth(auth, …)`; the SDK handler runs with `legacy: "reject"`.
- Every MCP tool is a thin wrapper over an existing service. Services keep
  calling `assertPermission`, so the fine-grained role check still runs inside
  the domain layer.

### Scopes and permissions

Scopes describe what a client may attempt on the user's behalf. Permissions
describe what the user may do now. Every call is the intersection of the two.

| Scope | Expands to |
| --- | --- |
| `api:read` | every `*:read` permission used by the tools |
| `api:write` | draft creation and edits (catalog, orders, receipts, plans, dispatches, waste) |
| `api:execute` | `production:execute`, `task:execute`, `stock:count` — posting and execution |
| `api:finance` | `report:read`, `cost:read`, `report:finance`, `report:traceability` |

`src/lib/scopes.ts` owns the mapping. `Actor.scopes` is optional: session actors
carry their whole role, MCP actors carry `token scopes ∩ current role`. Guards
read the set when it exists, so the same `assertPermission` protects a Server
Action and an MCP tool without changing the service layer.

Server Components and Server Actions are deliberately **not** driven by OAuth
tokens. They stay on the session cookie; adding bearer tokens there would mean
minting, expiring and refreshing credentials for a first-party browser session.
The shared part is the permission vocabulary and the guard, not the credential.

### Tenant binding and revocation

`postLogin.consentReferenceId` returns the session's active organization, so
consent is stored per tenant and the access token carries
`https://emma-elea.app/org`. Tool arguments never select the organization.

The resource server re-reads the membership on every call and rebuilds the scope
set from the current role. A demotion, removal or role change therefore applies
on the next request, even though the JWT stays valid until `exp` (one hour).

### Amendment (ADR-0021)

The scopes were renamed from `mcp:*` to resource-neutral `api:*`, the MCP
endpoint moved from `/api/mcp` to `/mcp`, and a second protected resource
(`/api`) was added. The authorization server, consent flow and tenant claim are
unchanged; only the audience and scope names differ.

### Positive Consequences

- No second authorization system; the role matrix stays normative.
- One MCP endpoint, stateless, horizontally scalable (no session store).
- Consent is explicit, per organization and per scope, and can be revoked by
  deleting the consent row.
- A future REST API can reuse the same scopes, `resolveTokenActor`-style claim
  mapping and `assertPermission`.

### Negative Consequences

- The MCP tool surface duplicates a thin adapter per service method. It is
  mechanical, but it must be updated when a service signature changes.
- `create_*` tools are not idempotent; a retried call can create a second draft.
  State-guarded operations (post, complete, start) reject duplicates.
- CIMD performs an outbound fetch. The bundled Node transport resolves DNS once
  and rejects private addresses, but a deployment on another runtime must supply
  an equivalent transport.
- Users without an active organization are sent to onboarding and do not return
  automatically to the authorization flow.

## Pros and Cons of the Options

### Hand-roll the OAuth provider

- Good: full control over consent, token format and storage.
- Bad: re-implements PKCE, DCR, CIMD, refresh rotation, DPoP and discovery; a
  security-critical surface with no domain benefit.

### `@better-auth/mcp`

- Good: reuses the existing user, session and organization tables; ships the
  discovery documents, consent flow and resource-server verification.
- Bad: a separately versioned package that must track `better-auth`; adds nine
  OAuth tables to the schema.

### Session cookies for MCP

- Good: no new protocol surface.
- Bad: MCP requires OAuth 2.1 discovery and bearer tokens; most hosts cannot
  send a first-party cookie.

### OAuth tokens for Server Actions and Components

- Good: one credential everywhere.
- Bad: browser sessions would need token issuance, storage, refresh and CSRF
  handling for no gain; the session cookie already carries the identity.

## Links

- [Better Auth MCP plugin](https://www.better-auth.com/docs/plugins/mcp)
- [MCP TypeScript SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/)
- Related ADRs: ADR-0004, ADR-0011, ADR-0012
