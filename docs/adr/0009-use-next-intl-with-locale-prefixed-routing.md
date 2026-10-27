# 0009. Use next-intl with locale-prefixed routing

- Status: Superseded by [ADR-0013](0013-use-cookie-based-locale-without-url-prefixes.md)
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The application ships English UI copy only, but needs to serve French as well.
The App Router, `cacheComponents`, and Astryx are already in place. Which
internationalization library and routing strategy should provide translations,
locale negotiation, and formatted messages without breaking static rendering?

## Decision Drivers

- Type-safe message keys shared by Server and Client Components
- Locale-specific URLs for SEO and for sharing links in a specific language
- Compatibility with Next.js 16 Cache Components and `next/root-params`
- Minimal custom infrastructure: one library instead of hand-rolled dictionaries
- Zod validation messages must be translatable without coupling schemas to React

## Considered Options

- `next-intl` 4 with locale-prefixed routes (`/en`, `/fr`)
- `next-intl` 4 without locale prefixes, locale read from a cookie
- `next-i18next` / Pages Router conventions
- A hand-rolled dictionary and `useState`-based locale switcher

## Decision Outcome

Chosen option: "`next-intl` 4 with locale-prefixed routes", because it provides
typed messages, locale negotiation in a Proxy, and static rendering per locale
while keeping one source of truth for routing configuration.

### Positive Consequences

- Every page exists per locale and is prerendered (`/en`, `/fr`, `/en/sign-in`,
  `/fr/sign-in`), so switching languages is a normal navigation.
- The locale is a root route parameter, so `next/root-params` supplies it to
  `getRequestConfig` without reading `cookies()`; Cache Components stays usable.
- `AppConfig` augmentation gives autocomplete and type errors for message keys
  and for the `Locale` union.
- `createNavigation` makes Astryx links and `router.push('/')` locale-aware
  without per-call prefix logic.

### Negative Consequences

- All existing URLs gain a locale prefix; `/` redirects to `/en` or `/fr` based
  on the `NEXT_LOCALE` cookie and `accept-language`.
- E2E tests and any external links must use prefixed paths.
- The whole catalog for the active locale is sent to Client Components through
  `NextIntlClientProvider`; splitting messages will be needed as the app grows.
- French copy is maintained in-repo and must be reviewed by a French speaker.

## Pros and Cons of the Options

### `next-intl` 4 with locale-prefixed routes

- Good, because URLs are shareable and indexable per language.
- Good, because root params keep `getRequestConfig` static-safe.
- Bad, because every route moves under `app/[locale]` and URLs change.

### `next-intl` 4 without locale prefixes

- Good, because existing URLs keep working.
- Bad, because the locale has to come from a cookie or header, which forces
  dynamic rendering and needs Suspense work under `cacheComponents`.
- Bad, because search engines cannot discover the French version.

### `next-i18next` / Pages Router conventions

- Good, because it is familiar.
- Bad, because it targets the Pages Router; this app uses the App Router
  (see ADR-0002).

### Hand-rolled dictionary

- Good, because it has no dependency.
- Bad, because it reimplements pluralization, formatting, negotiation, and
  routing, and loses type safety and tooling.

## Links

- [Application i18n configuration](../../src/i18n)
- [Message catalogs](../../messages)
- [Proxy](../../src/proxy.ts)
- [ADR-0002: Use Next.js App Router and Astryx](0002-use-nextjs-app-router-and-astryx.md)
- [next-intl App Router guide](https://next-intl.dev/docs/getting-started/app-router)
- [next-intl locale-based routing](https://next-intl.dev/docs/routing/setup)
