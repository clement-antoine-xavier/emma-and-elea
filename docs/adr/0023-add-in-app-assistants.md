# 0023. Add in-app assistants with the OpenAI Agents SDK

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-28

## Context and Problem Statement

Members already work through the dashboard, the MCP server and the REST API.
They still need a conversational surface that can answer questions and prepare
actions without leaving the page. The OpenAI Agents SDK provides agents, tools,
streaming and human approval, but it must not become a second authorization or
tenant system.

How do we add an assistant that uses the same services, permissions and tenant
actor as the rest of the app, while keeping irreversible actions under human
control?

## Decision Drivers

- One permission vocabulary: the assistant must call the same service methods
  as a page or a Server Action.
- Tenant isolation: the organization comes from the session, never from a model
  argument.
- Least privilege: the model must not see tools the member cannot use.
- Safety: drafts may be created automatically; postings, publications and
  decisions require an explicit approval.
- Cost and latency: two personas with capability bundles, not a swarm of
  independent agents.
- Secrets stay server-side and are documented in `.env.example` only.

## Considered Options

- Route the in-app assistant through the existing `/mcp` endpoint with OAuth
- Call services directly from in-process function tools using the session actor
- Give the assistant a service account or a separate database role
- Expose every service method to the model

## Decision Outcome

Chosen option: "Call services directly from in-process function tools using the
session actor".

- Two persona managers: **Emma** (revenue and customers) and **Éléa**
  (production and operations). They are UX boundaries; the role still decides
  which tools exist.
- `src/server/agents/capabilities/index.ts` is the catalogue. A capability is
  registered only when every required permission is granted. Services re-check
  `assertPermission` at call time.
- Specialists are tool bundles or sub-agents with read/draft tools. Every
  approval-gated tool belongs to a persona manager, so there is one approval
  point and one audit trail.
- Tools are thin wrappers over services and reuse `src/server/validators/api.schema.ts`.
  No tool accepts an `organizationId`.
- The route is `POST /dashboard/assistant/stream` (SSE). It uses the session
  cookie, an origin check and `getActorContext`; it is deliberately outside
  `/api/**` so it cannot be confused with the bearer-token resource.
- A run is persisted in `agent_conversation`, `agent_message`, `agent_run` and
  `agent_approval`. The SDK session stores its items as JSON; the run stores the
  serialized `RunState` while an approval is pending.
- Gated tools return a human approval card built by
  `src/server/agents/approvals/preview.ts` from services, not from the model.
  Approvals expire after ten minutes and are bound to the run, user and
  organization.
- `ASSISTANT_ENABLED` is false by default. `OPENAI_API_KEY`, `OPENAI_BASE_URL`,
  `ASSISTANT_MODEL`, per-persona overrides and the guardrail values live in
  `.env`; `.env.example` documents placeholders only.

### Positive Consequences

- The assistant shares the permission matrix, services and tenant resolution
  with every other surface.
- Costs and other sensitive fields are filtered by the service layer and by the
  capability list.
- A posting can never happen without a server-rendered approval and an audit
  row.
- The personas can be re-scoped without changing the tool implementations.

### Negative Consequences

- The agent tools duplicate the MCP adapters. Both must track service signature
  changes; a shared operations registry is the natural next refactor.
- A run state is large and must be stored while waiting for approval.
- The assistant depends on an external model provider; the rest of the app must
  keep working when it is disabled.
- Report tooling now gates cost, margin and waste-cost sections behind
  `report:finance`; sales and stock roles receive the operational sections only.

## Links

- ADR-0011 (role matrix), ADR-0012 (backend layers), ADR-0020 and ADR-0021
  (MCP and REST resources)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
