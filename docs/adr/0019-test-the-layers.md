# 0019. Test the layers: unit, database integration, end-to-end

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-27

## Context and Problem Statement

ADR-0007 chose Jest for units/components and Playwright against PostgreSQL for
end-to-end flows. That worked while the app was small, but the backend is now
layered (ADR-0012) and repositories own the risky code: transactions, FEFO
allocation, ledger signs, state guards and tenant filters. Jest never imported
those modules, so coverage reports showed 75% while most repositories were at
0%. A passing E2E happy path also cannot prove that a failed posting rolled
back, or that an archived record cannot be reused through a crafted request.

How should the suite prove each layer without turning every test into a browser
run or mocking the database?

## Decision Drivers

- Fast feedback for pure logic and component behaviour.
- Real PostgreSQL for repository transactions, constraints and cascades.
- Catch bugs in tenant isolation, stock arithmetic and state transitions.
- Keep CI reproducible and keep developer data safe.
- Coverage numbers that reflect what is actually untested.

## Considered Options

- Keep unit + E2E only, and cover repositories through more browser flows
- Add Jest integration tests against the real PostgreSQL database
- Mock Prisma in repository tests
- Replace Jest with another runner

## Decision Outcome

Chosen option: "Add Jest integration tests against the real PostgreSQL
database", because it exercises the exact queries, constraints and transaction
boundaries that production uses, without a browser.

The test pyramid is now:

1. **Unit/component** (`npm test`, `*.test.ts[x]`, jsdom)
   - Validators, domain calculators, services with repository doubles, lib,
     auth guards, actions, and form/navigation components.
2. **Repository integration** (`npm run test:integration`,
   `*.integration.test.ts`, node environment, real `DATABASE_URL`)
   - Each suite creates an isolated organization and user with a random suffix,
     builds its own fixtures through Prisma, and deletes only those rows.
   - The database is never truncated; suites are safe against a development
     database. `maxWorkers: 1` keeps fixture windows predictable.
   - Failures are forced to exit because the pg pool can outlive the worker.
3. **End-to-end** (`npm run test:e2e`, Playwright, real server and database)
   - Authentication, onboarding, navigation, permissions and full feature
     flows through the UI, plus security and i18n paths.

### Coverage

`jest.config.ts` uses `collectCoverageFrom` so untested modules are counted.
Generated Prisma, type-only DTOs, auth bootstrap files and route components are
excluded; route components are covered by Playwright. Thresholds guard the
layers the unit run exercises. Repository coverage is reported by the
integration suite instead of being merged into the unit report.

## Positive Consequences

- Repository bugs (rollback, FEFO, double posting, tenant leaks) are testable in
  milliseconds per case.
- Service unit tests stay fast because repositories remain plain doubles.
- Coverage now exposes real gaps and fails CI when a layer regresses.
- Bugs found while writing the suites became regression tests (see
  `docs/testing/bug-hunt.md`).

## Negative Consequences

- CI needs PostgreSQL before the integration step (it already provisions one
  for E2E).
- Integration suites must clean up their own tenant rows; a failed cleanup
  leaves `it-*@example.com` data behind.
- Two Jest configs to maintain, and repository coverage is not part of the
  lcov report.

## Links

- [Jest unit configuration](../../jest.config.ts)
- [Jest integration configuration](../../jest.integration.config.ts)
- [Integration fixtures](../../src/test-utils/integration/db.ts)
- [ADR-0007](0007-test-with-jest-and-playwright-against-postgresql.md)
- [Bug hunt log](../testing/bug-hunt.md)
