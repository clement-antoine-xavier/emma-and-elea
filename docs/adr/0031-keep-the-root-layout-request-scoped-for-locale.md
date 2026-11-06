# 31. Keep the root layout request-scoped for the locale cookie

- Status: Accepted
- Date: 2026-11-06

## Context

`next-intl` reads the `NEXT_LOCALE` cookie in `src/i18n/request.ts`, and
`src/app/layout.tsx` uses that locale for `<html lang>`, metadata, and
`NextIntlClientProvider`. Cache Components requires request data such as
`cookies()` to sit behind `<Suspense>` before a route can ship a static shell, so
the root layout currently exports `instant = false`.

The alternative is to move locale-dependent rendering into a client boundary.
That would either:

- render the default language first and switch after hydration, producing a
  visible language flash and incorrect metadata, or
- put the locale in the URL, which contradicts ADR-0013 (cookie-based locale
  without URL prefixes).

## Decision

Keep the root layout request-scoped and accept that a direct page load waits for
the locale cookie. Adopt Cache Components per route instead:

- Dashboard and assistant routes use `loading.tsx` or a route-level `<Suspense>`
  so client navigations render the shared shell immediately and stream data.
- `/sign-in` and `/sign-up` keep a request-independent frame in their Suspense
  fallback.
- `/onboarding`, `/consent`, and `/accept-invitation/[id]` stay blocking with
  `instant = false`: their first render needs the session and a signed query, and
  a shell without them would be misleading.

The locale cookie remains the single source of truth, and switching languages
keeps the current URL.

## Consequences

- Direct loads still wait for the session and locale; client navigations inside
  the dashboard and assistant are instant.
- Every adopted route must keep its data access behind a Suspense boundary or
  `loading.tsx`; the `blocking-prerender-*` validation messages catch
  regressions in development.
- A future locale strategy that can render a static `<html lang>` (for example,
  a client-side language negotiation with a documented flash policy) would
  supersede this ADR.
