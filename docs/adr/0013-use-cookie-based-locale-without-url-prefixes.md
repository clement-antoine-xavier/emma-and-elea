# 0013. Use a locale cookie without URL prefixes

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-27

Technical Story: Supersedes
[ADR-0009](0009-use-next-intl-with-locale-prefixed-routing.md).

## Context and Problem Statement

ADR-0009 chose locale-prefixed routes (`/en`, `/fr`) so each language had its
own shareable, indexable URL. The product now prefers one canonical URL per
page and a language choice that persists for the user instead of living in the
URL. How should `next-intl` resolve the active locale without locale prefixes?

## Decision Drivers

- One URL per page, independent of the language
- The language choice must persist across visits and reloads
- Keep `next-intl` message catalogs, type augmentation, and formatting
- Minimal custom infrastructure for locale validation and switching
- Accept the Cache Components consequences explicitly instead of mixing
  rendering models

## Considered Options

- A `NEXT_LOCALE` cookie read in `src/i18n/request.ts`, with no next-intl
  routing and no Proxy
- `next-intl` routing with `localePrefix: 'never'` (internal `[locale]`
  rewrite, static rendering preserved)
- Keep locale-prefixed routes (ADR-0009)

## Decision Outcome

Chosen option: "A `NEXT_LOCALE` cookie read in `src/i18n/request.ts`", because it
gives one canonical URL per page while keeping `next-intl` for messages and
formatting and removing the routing layer entirely.

### Positive Consequences

- URLs are stable (`/dashboard`, `/sign-in`) and work in every language.
- Language preference survives reloads for a year (`NEXT_LOCALE`, `lax`,
  `path=/`).
- No `[locale]` segment, no Proxy, and no locale-aware navigation wrappers;
  `Link` and `useRouter` come straight from Next.js.
- A stale or hand-edited cookie cannot break rendering: unknown values fall back
  to `en`.
- Switching language is a Server Action that writes the cookie and refreshes the
  current route, so the URL never changes.

### Negative Consequences

- The locale is request data, so every route renders per request. The build
  reports dynamic routes (`ƒ`), and `src/app/layout.tsx` sets
  `export const instant = false` so Cache Components allows the block. The
  landing page no longer ships a static shell.
- There is no `Accept-Language` negotiation: a first-time visitor gets `en`
  until they switch language. Detection can be added in `src/i18n/request.ts`
  later, at the cost of less deterministic tests.
- Search engines see one URL per page and no `hreflang` alternative links, so
  the French content is not independently indexable.
- Old locale-prefixed URLs (`/en/...`, `/fr/...`) no longer exist; new
  invitation links are generated unprefixed.
- Navigation and prefetching are validated as blocking; pages that read the
  session already set `instant = false`.

## Pros and Cons of the Options

### Cookie read in `src/i18n/request.ts`

- Good, because URLs stay clean and stable.
- Good, because there is no routing configuration or middleware to maintain.
- Bad, because the whole app becomes request-rendered and loses static shells.
- Bad, because locale negotiation and per-language SEO are given up.

### `localePrefix: 'never'`

- Good, because pages keep the internal `[locale]` segment, `next/root-params`,
  and per-locale prerendering.
- Good, because old prefixed URLs redirect to the unprefixed path.
- Bad, because the locale still lives in the internal URL, and the Proxy must be
  kept for rewrites and cookie syncing.
- Bad, because alternate links are disabled in that mode anyway.

### Keep locale-prefixed routes (ADR-0009)

- Good, because URLs are shareable and indexable per language.
- Bad, because the product wants a single canonical URL per page.
- Bad, because every internal link must stay locale-aware.

## Links

- [Application i18n configuration](../../src/i18n)
- [Locale cookie and resolution](../../src/i18n/locale.ts)
- [Request configuration](../../src/i18n/request.ts)
- [Root layout](../../src/app/layout.tsx)
- [Locale switch action](../../src/app/actions/locale.actions.ts)
- [ADR-0009: Use next-intl with locale-prefixed routing](0009-use-next-intl-with-locale-prefixed-routing.md)
- [next-intl App Router guide without i18n routing](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing)

---

Adapted from the MADR template published by the
[architecture-decision-record](https://github.com/architecture-decision-record/architecture-decision-record)
project.
