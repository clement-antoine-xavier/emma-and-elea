# 0030. Replace the OpenAI Agents SDK with the Vercel AI SDK

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-11-06

## Context and Problem Statement

The in-app assistants were built on `@openai/agents`. That SDK owns the agent
loop, the serialized run state used to resume approvals, and its own streaming
events. The application now targets Vercel and should use the Vercel AI SDK and
AI Gateway so model access, streaming and approvals share one ecosystem.

How do we keep the same personas, tools, permissions and human approvals while
changing the agent runtime?

## Decision Drivers

- One model-provider integration on Vercel (AI Gateway with OIDC).
- UI-message streaming compatible with `useChat`.
- Tool approval must still block postings and other irreversible actions.
- Conversation history must survive reloads.
- The service and permission layers must remain authoritative.

## Considered Options

- Keep the OpenAI Agents SDK and call AI Gateway as a compatible endpoint
- Replace the SDK with `streamText` and the AI SDK UI message stream
- Keep the custom SSE contract but use `generateText`

## Decision Outcome

Chosen option: "Replace the SDK with `streamText` and the AI SDK UI message
stream".

- `@openai/agents` is removed. `ai`, `@ai-sdk/react` and the Gateway provider
  replace it.
- Tool definitions remain plain service wrappers. `buildToolSet` binds the
  current `AssistantContext` with closures; no organization id is accepted from
  the model.
- `streamText` uses `toolApproval` for `needsApproval` tools and
  `experimental_toolApprovalSecret` to sign requests. The route is a UI message
  stream consumed by `useChat`.
- Conversation messages are stored as `UIMessage` JSON in `agent_message`.
  `toUIMessageStream({originalMessages, onEnd})` persists the full history after
  every turn.
- Approval previews are server-built and streamed as `data-approval` parts.
  `agent_approval` keeps the durable decision and expiry row.
- Legacy Agents SDK items are normalized to text UIMessages on read.
- Rate limiting uses `agent_run` counts rather than an in-memory map, so it works
  across serverless instances.

### Positive Consequences

- The assistant inherits AI Gateway authentication and observability.
- `useChat` provides streaming text, tool parts and approval state without a
  bespoke SSE parser.
- Approvals remain server-persisted and audit-friendly.
- The tool catalogue and service authorization are unchanged.

### Negative Consequences

- `agent_run.state` is obsolete; it remains nullable for a migration window.
- The assistant depends on the AI SDK UI message protocol and its version.
- Client-supplied history must be validated, signed for approvals, and checked
  against `agent_approval` before execution.

## Links

- ADR-0023 (superseded)
- [AI SDK streamText](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [AI SDK tool approval](https://ai-sdk.dev/docs/agents/tool-approvals)
- [AI SDK message persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence)
