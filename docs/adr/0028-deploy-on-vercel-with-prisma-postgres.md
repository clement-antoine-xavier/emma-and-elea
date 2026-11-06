# 0028. Deploy on Vercel with Prisma Postgres and AI Gateway

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-11-06

## Context and Problem Statement

The application was packaged for a self-hosted Docker deployment with a
one-shot migration service. The production target is now Vercel, where builds
and functions are short-lived and the database must be reachable through a
connection-pooled endpoint. The model provider also needs credentials that work
without copying a long-lived API key into every function.

How do we deploy the same application on Vercel while keeping the Docker path
available as an alternative?

## Decision Drivers

- Production deploys from the Git integration without a separate image registry.
- Serverless functions must not exhaust PostgreSQL connections.
- Migrations must be explicit and must not run from preview deployments.
- Model usage should be observable and authenticated without a plaintext key.
- Self-hosting with Docker and Compose must remain possible.

## Considered Options

- Replace Docker with Vercel and a managed PostgreSQL
- Keep Docker as the only production path
- Deploy on Vercel with Prisma Postgres, AI Gateway and Vercel Blob
- Run migrations at function startup

## Decision Outcome

Chosen option: "Deploy on Vercel with Prisma Postgres and AI Gateway".

- `next.config.ts` keeps `output: "standalone"` only when `VERCEL` is absent, so
  the Docker build is unchanged while Vercel uses its native output.
- `vercel.json` runs `npm run vercel-build`. The script generates Prisma, applies
  `prisma migrate deploy` only when `VERCEL_ENV=production`, then builds Next.js.
- Prisma Postgres supplies a direct endpoint in `DATABASE_URL` for the Prisma CLI
  and a pooled endpoint in `DATABASE_URL_POOLED` for the application. `PrismaPg`
  uses a one-connection pool per function instance.
- The Vercel Marketplace Prisma integration provisions the database and exposes
  both endpoints. The runtime prefers the pooled one.
- AI Gateway model IDs use the `creator/model-name` format. Vercel OIDC
  authenticates the Gateway in deployments; `AI_GATEWAY_API_KEY` covers local
  development.
- Preview deployments share the production database by default and skip
  migrations. A separate Prisma Postgres resource per environment is the
  supported way to isolate previews.
- The Dockerfile, Compose stack and GHCR workflow remain supported alternatives.

### Positive Consequences

- One Git push can build and deploy the application with no registry step.
- Pooled connections and a one-connection pool avoid serverless connection
  exhaustion.
- Production migrations run once per deployment and never from previews.
- Gateway usage is visible in Vercel and can use OIDC instead of a stored key.

### Negative Consequences

- Preview deployments need an explicit database-isolation decision.
- The direct and pooled URL split must be documented; using the direct URL at
  runtime under load hits the connection cap.
- Running migrations inside the production build makes the build depend on the
  database being reachable.
- The Docker and Vercel paths both need to keep working.

## Links

- [Vercel Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Prisma Postgres](https://www.prisma.io/docs/postgres)
- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
- ADR-0006 (Docker), ADR-0008 (GHCR), ADR-0030 (AI SDK)
