# 0006. Containerize with Docker and a migration service

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The application needs a reproducible production image, a local PostgreSQL
instance, and a safe way to apply Prisma migrations before the app starts. How
should the app and database be packaged and run?

## Decision Drivers

- Reproducible production image
- Local database that matches production's PostgreSQL major version
- Migrations that run exactly once before the app starts
- Small runtime image without build tooling or secrets
- Predictable service names and networking in Compose

## Considered Options

- Multi-stage Docker image with a one-shot Compose migration service
- Single-stage Docker image running migrations at app startup
- Host-installed PostgreSQL and a host-run Next.js server
- A platform-managed build and database

## Decision Outcome

Chosen option: "Multi-stage Docker image with a one-shot Compose migration
service", because it separates build tooling from runtime, keeps migrations
deterministic, and gives local and production deployments the same topology.

The implementation uses:

- `node:26.12.1-alpine3.24` for the `installer`, `builder`, `migrator`, and
  `runner` stages
- `postgres:18.6-alpine3.24`
- Next.js `output: "standalone"`
- Compose services `postgres`, `migrate`, and `emma-and-elea` on the
  `postgres-network` network
- a one-shot `migrate` service running `npx prisma migrate deploy`
- `app` depending on the migration job completing successfully
- a named volume mounted at `/var/lib/postgresql`, the PostgreSQL 18 image's
  volume root
- an unprivileged `node` user in the runtime image
- build-time placeholder `DATABASE_URL`, `BETTER_AUTH_SECRET`, and
  `BETTER_AUTH_URL` values that never reach the runtime image

### Positive Consequences

- The runtime image contains only the standalone server and its traced
  dependencies.
- Migrations run once and fail the stack before the app starts if they break.
- Local Compose and the production image use the same database major version.
- PostgreSQL data persists across container restarts.

### Negative Consequences

- The Docker build needs placeholder build-time environment variables because
  the auth module is imported during the Next.js build.
- `next start` warns with `output: "standalone"`, so Playwright uses the dev
  server instead of the production server.
- The `migrator` image is not published; only the app target is pushed to GHCR.
- PostgreSQL 18's volume path differs from older images and must not be changed
  to `/var/lib/postgresql/data` without a migration plan.

## Pros and Cons of the Options

### Multi-stage Docker image with a one-shot migration service

- Good, because build and runtime concerns are separated.
- Good, because migrations cannot race with app startup.
- Bad, because the Compose setup has more services and build stages.

### Single-stage Docker image running migrations at app startup

- Good, because there is only one service.
- Bad, because the runtime image includes build tooling and the Prisma CLI.
- Bad, because every app replica attempts migrations.

### Host-installed PostgreSQL and host-run Next.js server

- Good, because it is simple for a single developer.
- Bad, because environments drift and production packaging is untested.

### Platform-managed build and database

- Good, because it offloads operations.
- Bad, because it reduces control and portability.

## Links

- [Dockerfile](../../Dockerfile)
- [Docker Compose stack](../../docker-compose.yml)
- [Docker ignore rules](../../.dockerignore)
- [Docker documentation](https://docs.docker.com/)
- [Prisma Docker guide](https://www.prisma.io/docs/guides/deployment/docker)
