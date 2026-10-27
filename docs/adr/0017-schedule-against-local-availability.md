# 0017. Schedule shifts against local availability and approved absences

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-27

## Context and Problem Statement

A shift is an instant at a site, while availability is a recurring weekly
window written in local wall-clock minutes (0 = Monday). A planner can assign
the wrong person unless the application compares those two shapes correctly,
including daylight-saving changes. Staff also need a way to request time away,
and an approved absence must block a shift assignment.

## Decision Drivers

- Availability rules must be timezone-free and DST-safe.
- A shop in one timezone and a workshop in another must show the same shift at
  their own local time.
- Staff data must stay out of Better Auth tables so `auth:generate` can rewrite
  them safely (ADR-0004).
- Approval must be explicit and auditable.
- The rules must be unit-testable without a database.

## Considered Options

- Convert shift instants to site-local weekday/minutes, then compare them with
  availability windows; keep absences as approved instant ranges
- Store availability as timestamps and compare instants
- Ignore availability in v1 and rely on the planner
- Store all times as UTC wall-clock and ignore site timezones

## Decision Outcome

Chosen option: "Convert shift instants to site-local weekday/minutes, then
compare them with availability windows; keep absences as approved instant
ranges", because it keeps recurring availability timezone-free while shifts and
absences stay real instants.

- **Profiles** are `EmployeeProfile` rows linked one-to-one to a Better Auth
  `Member`. Members without a profile cannot be assigned. Job title, home site,
  contract hours and active state live on the profile.
- **Availability** is one or more `Availability` windows per employee, stored as
  weekday plus minute offsets. `validFrom`/`validTo` optionally bound a window's
  calendar-date range. A shift must fit inside one window; an employee with no
  windows is treated as flexible.
- **Shift creation** takes wall-clock input in the site timezone and stores
  instants. The service converts with `Intl` and iterates the offset to survive
  a DST boundary. Cross-midnight shifts are rejected in v1 because a single
  weekday window cannot describe them.
- **Assignment checks** run in this order: active employee, same local day,
  availability coverage, approved absence overlap, overlapping assignment.
  Availability and absence failures return `EMPLOYEE_UNAVAILABLE`; an overlap
  returns `SHIFT_CONFLICT`. Contract hours are displayed but not enforced yet.
- **Absences** are requested (or recorded by a manager) in the employee's home
  site timezone, then approved or rejected by a role with `absence:decide`.
  Approval fails if another approved absence overlaps. Only approved absences
  block assignments.
- **Permissions** stay split: `team:read` sees the rota, `team:write` manages
  employees, availability, shifts and assignments, `absence:request` requests,
  and `absence:decide` approves.

### Positive Consequences

- Availability is stable across DST and can be reused every week.
- A shift always displays in the local time of its site.
- Assignments fail loudly instead of silently double-booking someone.
- Staff profiles survive a regeneration of Better Auth models.

### Negative Consequences

- Cross-midnight and overnight shifts need a later model extension.
- Contract-hour overloads are visible but not blocked.
- Employees without declared availability can be assigned freely until a
  manager adds windows.
