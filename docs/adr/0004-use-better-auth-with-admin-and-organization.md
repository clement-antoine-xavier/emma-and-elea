# 0004. Use Better Auth with admin and organization plugins

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The application needs email/password authentication, session management, user
roles, and organizations for future multi-tenant features. The auth system must
use the existing PostgreSQL database and integrate with the Next.js App Router.

## Decision Drivers

- Self-hosted auth with data in the project database
- First-class Prisma adapter
- Roles and organization membership without a separate service
- Client and server APIs that work with Next.js route handlers

## Considered Options

- Better Auth 1.7 with the Prisma adapter
- Auth.js / NextAuth
- A hosted provider such as Clerk
- Custom session and password handling

## Decision Outcome

Chosen option: "Better Auth 1.7 with the Prisma adapter", because it supports
the required plugins, stores auth data in the project database, and exposes both
server and browser APIs.

The implementation uses:

- `betterAuth()` with `prismaAdapter(prisma, { provider: "postgresql" })`
- email/password authentication
- `admin()` and `organization()` plugins
- `nextCookies()` as the final plugin for server-action cookie support
- `toNextJsHandler(auth)` at `src/app/api/auth/[...all]/route.ts`
- Astryx-powered `/sign-in` and `/sign-up` pages
- admin and organization client plugins in `src/lib/auth-client.ts`

### Positive Consequences

- Users, sessions, accounts, organizations, members, and invitations live in the
  same PostgreSQL database as domain data.
- Roles and organization membership are available without another vendor.
- The browser client and server API share inferred types.

### Negative Consequences

- Auth configuration changes require regenerating the Prisma schema and running
  a migration.
- Admin and organization management UIs, email verification, and password reset
  are follow-up work.
- Better Auth's plugin schemas are part of the database contract.

## Pros and Cons of the Options

### Better Auth 1.7 with the Prisma adapter

- Good, because it covers authentication, roles, and organizations in one stack.
- Good, because auth data stays in the project database.
- Bad, because plugin changes add schema and migration steps.

### Auth.js / NextAuth

- Good, because it is widely used in the Next.js ecosystem.
- Bad, because roles and organizations require additional custom modeling.

### Hosted provider such as Clerk

- Good, because it offloads auth operations and UI.
- Bad, because user data lives outside the project database and adds a vendor
  dependency.

### Custom authentication

- Good, because it is fully tailored.
- Bad, because password and session security are costly to implement correctly.

## Links

- [Server auth configuration](../../src/lib/auth.ts)
- [Browser auth client](../../src/lib/auth-client.ts)
- [Auth route handler](../../src/app/api/auth/[...all]/route.ts)
- [Auth form](../../src/components/auth-form.tsx)
- [Better Auth documentation](https://better-auth.com/docs)
- [Better Auth Prisma adapter](https://better-auth.com/docs/adapters/prisma)
