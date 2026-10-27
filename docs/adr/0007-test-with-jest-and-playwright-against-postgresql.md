# 0007. Test with Jest and Playwright against PostgreSQL

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The project needs confidence in validation logic, form behavior, authentication
flows, and database persistence. Mocking the database would not validate the
Prisma schema, Better Auth, and migrations together. How should unit and
end-to-end coverage be structured?

## Decision Drivers

- Fast feedback for pure logic and component behavior
- End-to-end coverage of authentication against the real stack
- Reproducible tests in CI
- Clean test data without wiping development data

## Considered Options

- Jest + React Testing Library for units/components and Playwright with a real
  PostgreSQL database for E2E
- Vitest + Testing Library and Cypress
- Unit tests only
- E2E tests with a mocked database

## Decision Outcome

Chosen option: "Jest + React Testing Library for units/components and Playwright
with a real PostgreSQL database for E2E", because it covers both fast logic tests
and the real auth/database path.

The implementation uses:

- Jest 30 with `next/jest`, jsdom, and `@testing-library/jest-dom`
- schema tests for Zod validation and a component test for the RHF/Astryx field
  wrapper
- Playwright with Chromium
- `e2e/global-setup.ts` to delete stale `e2e-%@example.com` users
- a direct PostgreSQL query in the E2E test to verify persistence
- unique test users deleted after each run
- the real PostgreSQL service in the Next.js CI workflow

### Positive Consequences

- Validation rules are tested without rendering a browser.
- The E2E suite exercises Better Auth, Prisma, migrations, and the UI together.
- Test emails are isolated and cleaned up automatically.

### Negative Consequences

- CI must install a Playwright browser and wait for the dev server.
- Astryx's ESM modules must be mocked in Jest component tests.
- E2E tests require a running PostgreSQL database locally.
- E2E runs against the dev server because the production image uses
  `output: "standalone"` and `next start` warns in that mode.

## Pros and Cons of the Options

### Jest + React Testing Library and Playwright with real PostgreSQL

- Good, because unit tests are fast and E2E tests cover the real integration.
- Good, because the same database path is used locally and in CI.
- Bad, because E2E adds browser installation and server startup time.

### Vitest + Testing Library and Cypress

- Good, because Vitest is fast and Cypress has a strong UI runner.
- Bad, because it would replace the Next.js Jest integration and add a second
  test runner.

### Unit tests only

- Good, because it is fast and inexpensive.
- Bad, because it would not catch auth, Prisma, or migration regressions.

### E2E tests with a mocked database

- Good, because tests are isolated and fast.
- Bad, because it would not verify the real schema or Better Auth persistence.

## Links

- [ADR-0019](0019-test-the-layers.md) extends this decision with repository
  integration tests against the same PostgreSQL database.
- [Jest configuration](../../jest.config.ts)
- [Jest setup](../../jest.setup.ts)
- [Playwright configuration](../../playwright.config.ts)
- [E2E auth tests](../../e2e/auth.spec.ts)
- [E2E database helpers](../../e2e/db.ts)
- [Jest + Next.js guide](https://nextjs.org/docs/app/guides/testing/jest)
- [Playwright + Next.js guide](https://nextjs.org/docs/app/guides/testing/playwright)
