# Architecture Decision Records

This directory records the significant architecture decisions for Emma & Elea.
Each record explains the context, the options considered, the decision, and its
consequences. The records use the
[MADR template](https://github.com/architecture-decision-record/architecture-decision-record)
and are immutable once accepted; supersede an ADR instead of rewriting its
decision.

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted | 2026-10-26 |
| [0002](0002-use-nextjs-app-router-and-astryx.md) | Use Next.js App Router and Astryx | Accepted | 2026-10-26 |
| [0003](0003-use-postgresql-18-and-prisma-7.md) | Use PostgreSQL 18 and Prisma 7 | Accepted | 2026-10-26 |
| [0004](0004-use-better-auth-with-admin-and-organization.md) | Use Better Auth with admin and organization plugins | Accepted | 2026-10-26 |
| [0005](0005-use-zod-and-react-hook-form.md) | Use Zod and React Hook Form for forms | Accepted | 2026-10-26 |
| [0006](0006-containerize-with-docker-and-a-migration-service.md) | Containerize with Docker and a migration service | Accepted | 2026-10-26 |
| [0007](0007-test-with-jest-and-playwright-against-postgresql.md) | Test with Jest and Playwright against PostgreSQL | Accepted | 2026-10-26 |
| [0008](0008-use-github-actions-and-ghcr.md) | Use GitHub Actions and GHCR | Accepted | 2026-10-26 |
| [0009](0009-use-next-intl-with-locale-prefixed-routing.md) | Use next-intl with locale-prefixed routing | Superseded by [0013](0013-use-cookie-based-locale-without-url-prefixes.md) | 2026-10-26 |
| [0010](0010-model-the-production-domain.md) | Model the production domain around items, recipe versions and a stock ledger | Accepted | 2026-10-26 |
| [0011](0011-model-organization-roles-and-permissions.md) | Model organization roles and permissions in code | Accepted | 2026-10-26 |
| [0012](0012-layer-the-backend.md) | Layer the backend into services and repositories | Accepted | 2026-10-26 |
| [0013](0013-use-cookie-based-locale-without-url-prefixes.md) | Use a locale cookie without URL prefixes | Accepted | 2026-10-27 |
| [0014](0014-post-ledger-changes-in-one-transaction.md) | Post ledger changes as one repository transaction | Accepted | 2026-10-27 |
| [0015](0015-separate-dispatch-stock-from-daily-sales.md) | Record dispatches in the stock ledger and daily sales separately | Accepted | 2026-10-27 |
| [0016](0016-forecast-from-daily-sales.md) | Forecast from daily sales and keep plans as snapshots | Accepted | 2026-10-27 |
| [0017](0017-schedule-against-local-availability.md) | Schedule shifts against local availability and approved absences | Accepted | 2026-10-27 |
| [0018](0018-post-stock-counts-from-captured-expected.md) | Post stock counts from captured expected quantities | Accepted | 2026-10-27 |
| [0019](0019-test-the-layers.md) | Test the layers: unit, database integration, end-to-end | Accepted | 2026-10-27 |
| [0020](0020-expose-mcp-through-better-auth-oauth.md) | Expose MCP through Better Auth OAuth | Accepted | 2026-10-27 |
| [0021](0021-expose-a-rest-api-as-a-second-oauth-resource.md) | Expose a REST API as a second OAuth resource | Accepted | 2026-10-27 |
| [0022](0022-consolidate-settings-into-one-route.md) | Consolidate settings into one route with a section rail | Accepted | 2026-10-28 |
| [0023](0023-add-in-app-assistants.md) | Add in-app assistants with the OpenAI Agents SDK | Accepted | 2026-10-28 |
| [0024](0024-refresh-stored-costs-on-demand.md) | Refresh stored costs on demand with an input fingerprint | Accepted | 2026-10-29 |
| [0025](0025-define-product-profitability.md) | Define product profitability as produced minus sold minus waste | Accepted | 2026-10-29 |
| [0026](0026-generate-production-tasks-from-recipe-operations.md) | Generate production tasks from recipe operations | Accepted | 2026-10-29 |

## Creating a new ADR

1. Copy `template.md` to `NNNN-short-title.md`, using the next four-digit number.
2. Fill in the context, drivers, options, outcome, and consequences.
3. Start with status `Proposed`; change it to `Accepted` when the decision is made.
4. Add the ADR to the table above.
5. If a decision changes, mark the old ADR `Superseded by ADR-NNNN` and
   write a new ADR instead of editing the old decision.
