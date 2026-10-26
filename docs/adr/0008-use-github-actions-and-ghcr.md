# 0008. Use GitHub Actions and GHCR

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The project needs automated checks on changes and a repeatable way to build and
publish the Docker image. How should continuous integration and image publishing
be organized?

## Decision Drivers

- Fast feedback on pull requests and `main`
- Real PostgreSQL for migrations and E2E tests
- Reproducible image publishing without long-lived registry credentials
- Clear separation between quality checks and image delivery

## Considered Options

- Two GitHub Actions workflows with GHCR
- One combined GitHub Actions workflow
- Another CI provider with Docker Hub
- Manual checks and image builds

## Decision Outcome

Chosen option: "Two GitHub Actions workflows with GHCR", because GitHub Actions
is native to the repository and GHCR authenticates with the workflow token.

The implementation uses:

- `.github/workflows/next.js.yml` on pushes and pull requests to `main`
  - PostgreSQL 18.6 service
  - `npm run db:deploy`
  - `npm run typecheck` (`next typegen && tsc --noEmit`)
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - Playwright E2E
  - Playwright report upload on failure
- `.github/workflows/docker.yml` on `main` pushes, `v*` tags, and manual dispatch
  - `docker/build-push-action` with the `runner` target
  - `linux/amd64`
  - GHCR image `ghcr.io/clement-antoine-xavier/emma-and-elea`
  - `latest`, `main`, `sha-*`, and semver tags
  - GitHub Actions layer cache
- third-party actions pinned to exact release tags such as `v7.0.1`

### Positive Consequences

- Every pull request validates the real database and auth stack.
- The Docker image is published without storing a separate registry password.
- The Next.js and Docker workflows can run in parallel.

### Negative Consequences

- The workflows are independent, so a lint-only failure in the Next.js workflow
  does not block the Docker image push.
- GHCR package visibility and runner permissions must be configured correctly.
- Action pins require deliberate updates.
- The `ubuntu-latest` runner label is migrating to Ubuntu 26 in October 2026.

## Pros and Cons of the Options

### Two GitHub Actions workflows with GHCR

- Good, because checks and image delivery are clearly separated.
- Good, because GHCR avoids a separate registry credential.
- Bad, because Docker is not gated by the Next.js checks.

### One combined GitHub Actions workflow

- Good, because Docker can depend on checks with `needs`.
- Bad, because image builds are delayed by all checks and the files are larger.

### Another CI provider with Docker Hub

- Good, because it may offer different runner or registry features.
- Bad, because it adds credentials, configuration, and a second platform.

### Manual checks and image builds

- Good, because there is no CI configuration.
- Bad, because checks are easy to skip and images are not reproducible.

## Links

- [Next.js workflow](../../.github/workflows/next.js.yml)
- [Docker workflow](../../.github/workflows/docker.yml)
- [Dockerfile](../../Dockerfile)
- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [GitHub Container Registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
