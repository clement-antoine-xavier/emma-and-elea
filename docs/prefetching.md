# Prefetching audit

`partialPrefetching` and `cacheComponents` are enabled in `next.config.ts`.
Every visible `<Link>` therefore prefetches the destination's App Shell, and
`prefetch={true}` would additionally resolve URL-specific content for that link.

## Current call sites

| Source | Decision |
| --- | --- |
| Side navigation (`DashboardSideNav`) | Default prefetch of the App Shell. Dashboard pages stream their data through `src/app/dashboard/loading.tsx`. |
| Landing, auth and footer links | Default prefetch. Public routes have static frames. |
| Assistant recent conversations | `router.push` without a prefetched full render. The conversation route streams its transcript, and `e2e/instant/assistant.spec.ts` asserts the shell. |
| `router.prefetch()` | Not used. |
| Explicit `prefetch={true}` | None. The App Shell is enough; URL-specific data streams after navigation. |

## Rules

- Prefer the default App Shell prefetch. Add `prefetch={true}` only when a
  destination's above-the-fold content depends on `params` or `searchParams` and
  must be visible before navigation.
- Do not add `prefetch={true}` to a route that is still `instant = false`; the
  prefetch would cache an empty shell.
- Keep `e2e/instant/` green with `npm run build:test && npm run test:e2e:instant`
  after changing a prefetch or a Suspense boundary.
