# 0002. Use Next.js App Router and Astryx

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The application needs a React framework, routing model, rendering strategy, and
a consistent UI system. The project already targets Next.js 16.4.3, React 19.3,
and Astryx 0.7.4 with the Butter theme. Which foundation should the rest of the
application build on?

## Decision Drivers

- Server Components and streaming for authenticated pages
- A single component and theming system instead of hand-rolled UI
- TypeScript-first development
- Compatibility with React 19 and the Next.js App Router

## Considered Options

- Next.js App Router with React 19 and Astryx
- Next.js Pages Router with Astryx
- Next.js App Router with a different UI library
- A non-Next.js React framework

## Decision Outcome

Chosen option: "Next.js App Router with React 19 and Astryx", because it matches
the existing project setup and gives the application one routing model, one
theme, and one component library.

### Positive Consequences

- Server Components can read sessions and data without shipping that logic to
  the browser.
- Astryx provides layout, input, card, and theme primitives consistently.
- The generated Butter theme is wired once in `src/app/providers.tsx`.

### Negative Consequences

- App Router and `cacheComponents` require care around dynamic session reads.
- Astryx is ESM, so Jest component tests must mock its modules or add a targeted
  transform.
- Astryx-specific conventions must be followed instead of arbitrary HTML.

## Pros and Cons of the Options

### Next.js App Router with React 19 and Astryx

- Good, because it uses the existing stack and theme.
- Good, because Server Components and client boundaries are explicit.
- Bad, because Astryx ESM complicates unit testing.

### Next.js Pages Router with Astryx

- Good, because the Pages Router is simpler and well understood.
- Bad, because it forgoes App Router server components and layouts.

### Next.js App Router with a different UI library

- Good, because it may offer different accessibility or design primitives.
- Bad, because it would replace the existing theme and component conventions.

## Links

- [Application source](../../src/app)
- [Astryx theme module](../../src/astryx-themes.ts)
- [Project instructions](../../AGENTS.md)
- [Next.js App Router documentation](https://nextjs.org/docs/app)
- [Astryx package](https://www.npmjs.com/package/@astryxdesign/core)
