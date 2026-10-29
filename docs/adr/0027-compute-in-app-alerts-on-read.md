# 0027. Compute in-app alerts on read, without a notification store

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-29

## Context and Problem Statement

Low stock, expiring lots, absences waiting for a decision and unassigned tasks
already exist in their own screens. Users still need one place that answers
“what needs attention today?”. Email and push delivery would require a provider,
an outbox and a scheduler that the deployment does not have.

## Decision Drivers

- Ship an alert centre without new infrastructure or a schema change.
- Respect permissions: an alert must only appear when the viewer can open it.
- Avoid stale duplicates: the underlying rows are the source of truth.
- Keep the door open for email later without coupling it to the screens.

## Considered Options

- Persist notification rows and deliver them by email
- Compute alerts on read from the existing repositories
- Build a separate alerting service with a message broker

## Decision Outcome

Chosen option: "Compute on read", because the volumes are small and the data is
already indexed for the source screens.

- `alertService` reads stock levels, expiring lots (7-day window), requested
  absences and unassigned tasks in parallel.
- Each block is only queried when the actor holds the matching permission
  (`stock:read`, `absence:decide`, `task:read`).
- Alerts are pure DTOs with a title, description and link; nothing is persisted.
- `/dashboard/alerts` is available to every member (`organization:read`) and the
  content narrows by role.

### Positive Consequences

- No migration, no background worker and no duplicated state.
- A fixed alert always reflects the current rows.

### Negative Consequences

- No read/unread state, snoozing or delivery history.
- Email/push would need a new outbox and scheduler; this ADR does not cover it.

## Links

- Related ADR: ADR-0011 (permissions)
- Source: `src/server/services/alert.service.ts`
