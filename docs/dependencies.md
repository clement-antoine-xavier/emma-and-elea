# Dependency review policy

Dependencies are reviewed in three places:

- **Dependabot** (`.github/dependabot.yml`) opens weekly npm, GitHub Actions and
  Docker updates. Patch and minor npm updates are grouped into one pull request;
  majors stay separate.
- **Scheduled audit** (`.github/workflows/dependency-audit.yml`) runs
  `npm audit --omit=dev --audit-level=high` and reports `npm outdated` every
  Monday.
- **CI** runs typecheck, lint, unit, integration, build and E2E on every pull
  request, so an update only merges when the full suite is green.

## Review rules

1. Merge a grouped patch/minor pull request after CI passes. Review the lockfile
   diff and the changelog for `next`, `react`, `better-auth` and Astryx.
2. Review a major upgrade manually as its own pull request, with a migration
   note in `docs/adr/` when it changes an architectural contract.
3. Never merge a runtime audit finding above `high`. Add a scoped `overrides`
   entry when an upstream package has not released a fix, and document it in the
   pull request.
4. Third-party GitHub Actions stay pinned to an exact release tag. Dependabot
   updates them deliberately; CI must pass before merging.

## Held majors

These majors are intentionally blocked until their migrations are planned:

- **Prisma 8**: its contract API is not supported by Better Auth's Prisma
  adapter.
- **TypeScript 7**: requires a dedicated compiler migration.
- **ESLint 10**: requires the flat-config and plugin review.
- **`@hookform/resolvers` 7**: declares an optional `effect@4` peer that breaks
  npm resolution while Prisma 7 depends on `effect@3`.
