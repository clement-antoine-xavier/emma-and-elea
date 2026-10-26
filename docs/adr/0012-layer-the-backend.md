# 0012. Layer the backend into services and repositories

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The authentication and team features were implemented directly in Server
Actions and Server Components: Prisma queries, Better Auth calls, role rules
and UI error mapping lived in the same files. That works for one feature but
does not scale to recipes, stock, production and orders, where the same
authorization and tenant rules must be reused and tested.

The question: how should entry points, business rules and data access be
separated without replacing Next.js, Prisma or Better Auth?

## Decision Drivers

- One place for tenant and role authorization.
- Testable business rules without a database or HTTP request.
- No Prisma or Better Auth imports in pages, Server Actions or Client
  Components.
- Better Auth remains the owner of authentication and organization plugin
  writes.
- The existing App Router, next-intl and Astryx conventions stay unchanged.

## Considered Options

- Layered services and repositories with thin entry points
- Keep logic in Server Actions and add shared helpers over time
- Introduce a framework such as NestJS or tRPC
- Move all logic into Prisma middleware/extensions

## Decision Outcome

Chosen option: "Layered services and repositories", because it adds structure
without a new runtime or a second API surface.

The layers are:

```text
Route Handler / Server Action / Server Component
  -> src/server/services
    -> src/server/repositories -> Prisma -> PostgreSQL
    -> src/server/auth/better-auth.gateway -> Better Auth
```

- **Entry points** (`src/app/**`, `src/app/actions/**`) resolve the actor,
  validate external input with Zod, call one service, map domain errors, and
  render or return the result. They never import Prisma.
- **Services** (`src/server/services`) enforce permissions and tenant rules,
  orchestrate repositories and the auth gateway, and return plain DTOs or throw
  `DomainError`.
- **Repositories** (`src/server/repositories`) own Prisma. They map database
  rows to plain records and never contain business rules.
- **Validators** (`src/server/validators`) hold Zod schemas. They are pure and
  may be imported by client forms for the same rules.
- **Auth gateway** (`src/server/auth/better-auth.gateway.ts`) wraps
  `auth.api` organization mutations, receives the request `Headers`, and maps
  Better Auth error codes to domain errors. Services never call `auth.api`.
- **Session helper** (`src/server/auth/actor.ts`) resolves the Better Auth
  session and the caller's membership. The organization always comes from the
  session, never from a route parameter or form field.

Better Auth keeps ownership of `user`, `session`, `account`, `organization`,
`member` and `invitation` writes. Repositories may read organization, member
and invitation rows for views; writes go through the gateway.

The pure role matrix stays in `src/lib/permissions.ts` because the browser needs
the same policy for rendering. This is a deliberate shared policy module, not a
service. Domain calculators (`units`, `stock-count`) live in
`src/server/domain`.

Entry points are protected by ESLint rules: `src/app/**` cannot import
`@/lib/prisma`, `@/lib/auth` or repositories; `src/components/**` cannot import
server layers or Prisma.

### Positive Consequences

- Authorization and tenant checks are centralized and unit-testable.
- Pages and actions stay small and presentation-focused.
- Swapping a data source or the auth provider touches one layer.
- Domain errors have one mapping point per entry point.

### Negative Consequences

- More files and indirection for small features.
- A repository DTO must be written for each read shape.
- Better Auth plugin tables still need careful handling: reads may use
  repositories, writes must use the gateway.
- The shared permission matrix is an explicit exception to `src/lib` being
  only low-level utilities.

## Pros and Cons of the Options

### Layered services and repositories

- Good, because it matches the existing Next.js and Prisma stack.
- Good, because services can be tested with in-memory fakes.
- Bad, because every feature needs repository and service wiring.

### Keep logic in Server Actions

- Good, because it is the shortest path for a single feature.
- Bad, because repeated Prisma, tenant and Better Auth logic drifts.

### NestJS or tRPC

- Good, because they provide structure and typed APIs.
- Bad, because they add a framework, a second routing model and a migration.

### Prisma middleware

- Good, because it can enforce tenant filters centrally.
- Bad, because it hides business rules in the data layer and cannot express
  role decisions or Better Auth orchestration.

## Links

- [Permissions](permissions.md)
- [ADR-0011](0011-model-organization-roles-and-permissions.md)
- [Auth actor](../../src/server/auth/actor.ts)
- [Auth gateway](../../src/server/auth/better-auth.gateway.ts)
- [Service container](../../src/server/services/container.ts)
