# 0001. Record architecture decisions

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The project's architectural choices were spread across source files, commit
messages, and agent instructions. That made it difficult to understand why a
choice was made, which alternatives were rejected, and what trade-offs are
expected. How should the project preserve the reasoning behind significant
technical decisions?

## Decision Drivers

- Keep decision context close to the code
- Make trade-offs reviewable during onboarding and future changes
- Avoid heavyweight process for a small project
- Record superseded decisions without rewriting history

## Considered Options

- Architecture Decision Records in the repository using MADR
- A project wiki or external documentation site
- Commit messages and pull request descriptions only
- No formal decision record

## Decision Outcome

Chosen option: "Architecture Decision Records in the repository using MADR",
because it keeps the context versioned with the code and provides a consistent
structure for options, consequences, and links.

### Positive Consequences

- Decisions and their rejected alternatives are discoverable in the repository.
- Reviews can challenge assumptions explicitly rather than reverse-engineering
  them from code.
- The template and index make new ADRs cheap to add.

### Negative Consequences

- ADRs require maintenance when decisions change.
- The team must remember to supersede old records instead of editing history.

## Pros and Cons of the Options

### Architecture Decision Records in the repository using MADR

- Good, because records are versioned and reviewed with the code.
- Good, because MADR captures drivers, options, and consequences.
- Bad, because it adds a small documentation step to architectural changes.

### Project wiki or external documentation

- Good, because it can be richer and easier for non-engineers to browse.
- Bad, because it drifts from the code and is not reviewed with pull requests.

### Commit messages and pull request descriptions

- Good, because it requires no extra files.
- Bad, because the reasoning is hard to find and is not structured.

## Links

- [ADR-0002](0002-use-nextjs-app-router-and-astryx.md)
- [ADR-0003](0003-use-postgresql-18-and-prisma-7.md)
- [ADR-0004](0004-use-better-auth-with-admin-and-organization.md)
- [ADR-0005](0005-use-zod-and-react-hook-form.md)
- [ADR-0006](0006-containerize-with-docker-and-a-migration-service.md)
- [ADR-0007](0007-test-with-jest-and-playwright-against-postgresql.md)
- [ADR-0008](0008-use-github-actions-and-ghcr.md)
- [MADR template source](https://github.com/architecture-decision-record/architecture-decision-record)
