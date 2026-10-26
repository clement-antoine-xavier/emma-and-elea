# 0003. Use PostgreSQL 18 and Prisma 7

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The application needs a relational database for users, sessions, organizations,
and future domain data, plus a typed data-access layer and a repeatable schema
migration workflow. Which database and ORM should the project use?

## Decision Drivers

- Type-safe queries and schema migrations
- Compatibility with Better Auth's Prisma adapter
- Local development that matches the production database major version
- Generated SQL that is reviewable and committed

## Considered Options

- PostgreSQL 18 with Prisma 7
- PostgreSQL 18 with Prisma 8 release candidate
- PostgreSQL with Drizzle
- PostgreSQL with raw SQL and a query builder

## Decision Outcome

Chosen option: "PostgreSQL 18 with Prisma 7", because Prisma 7 is the current
stable line and Better Auth's Prisma adapter targets its client API. The
project pins `prisma@7.10.1` and `@prisma/client@7.10.1`.

The implementation uses:

- `prisma-client` generator with output in `src/generated/prisma`
- `@prisma/adapter-pg` and `pg` at runtime
- `prisma7.config.ts` for the Prisma 7 CLI
- committed migrations in `prisma/migrations/`

Prisma 8 RC was rejected because its new `@prisma/orm-postgres` contract API
does not expose the model-delegate client that Better Auth's adapter uses.

### Positive Consequences

- Queries and schema changes are typechecked.
- Migrations are versioned and applied consistently locally and in production.
- The runtime uses a normal PostgreSQL driver adapter, which works with the
  standalone Next.js image.

### Negative Consequences

- The project cannot upgrade to Prisma 8 until Better Auth supports it.
- The generated client is gitignored and must be regenerated after install,
  schema changes, and builds.
- Prisma 7 requires a configuration file separate from the schema data source.

## Pros and Cons of the Options

### PostgreSQL 18 with Prisma 7

- Good, because it is stable and supported by Better Auth.
- Good, because migrations and generated types fit the existing workflow.
- Bad, because the ORM major version is temporarily pinned.

### PostgreSQL 18 with Prisma 8 release candidate

- Good, because it offers the new Prisma ORM API.
- Bad, because it is a release candidate.
- Bad, because Better Auth's Prisma adapter is incompatible with it today.

### PostgreSQL with Drizzle

- Good, because it is SQL-first and lightweight.
- Bad, because it would add a second data layer and require rewriting the auth
  adapter setup.

### PostgreSQL with raw SQL

- Good, because it has no ORM abstraction.
- Bad, because it loses typed models and an integrated migration workflow.

## Links

- [Prisma schema](../../prisma/schema.prisma)
- [Prisma configuration](../../prisma7.config.ts)
- [Initial migration](../../prisma/migrations/20261026181301_init/migration.sql)
- [Database client](../../src/lib/prisma.ts)
- [Prisma ORM documentation](https://www.prisma.io/docs/orm)
- [Prisma adapter for PostgreSQL](https://www.prisma.io/docs/orm/overview/databases/postgresql)
