# 0022. Consolidate settings into one route with a section rail

- Status: Accepted
- Deciders: Product and engineering
- Date: 2026-10-28

## Context and Problem Statement

Settings were four sibling routes (`/dashboard/settings`, `sites`, `rates`,
`equipment`), each with its own page header and a "Back to settings" link.
The hub itself was a grid of navigation cards. Traversing between reference
data took two navigations, the routes duplicated the same page frame, and the
hub did not follow the Astryx `settings-sidebar` template the rest of the
workspace now uses. How should settings be organized so sections are reachable
in one step while keeping per-section permissions?

## Decision Drivers

- One navigation step between organization, sites, rates and equipment.
- Each section keeps its own permission (`organization:read`, `site:read`,
  `cost:read`, `equipment:read`); sections a role cannot read must not appear.
- No URL breakage for bookmarks, the site edit route, or existing links.
- Keep the layered architecture: the page resolves the actor, calls services,
  and renders; no repository access.
- Avoid loading data for sections the actor cannot see.

## Considered Options

- Keep the four routes and restyle each.
- Consolidate into `/dashboard/settings?section=…` with a rail.
- Consolidate into `/dashboard/settings/[section]` with a dynamic segment.

## Decision Outcome

Chosen option: "Consolidate into `/dashboard/settings?section=…` with a rail".

The page gates on `organization:read`, which every organization role holds,
then filters the rail with the shared `can()` helper. It resolves the requested
section, falls back to `organization` when the section is unknown or not
permitted, and loads only that section's services. The old routes remain as
thin `redirect()` stubs to their section so existing links keep working. Site
editing stays at `/dashboard/settings/sites/[id]`.

### Positive Consequences

- Settings sections are one click apart and share one frame.
- The rail is the single source of truth for which sections a role can reach.
- Only the active section's data is fetched.

### Negative Consequences

- Section state lives in a query parameter rather than a path segment.
- `?section=` is not validated by the route tree, so the page must fall back.
- The obsolete "Manage" cards and "Back to settings" copy remain in the
  message catalogs until a cleanup pass.

## Pros and Cons of the Options

### Keep the four routes and restyle each

- Good, because no routing change and no ADR.
- Bad, because section switching still costs a trip through the hub.

### `/dashboard/settings?section=…`

- Good, because it avoids a dynamic segment colliding with
  `/settings/sites/[id]`, and keeps redirect stubs trivial.
- Bad, because an invalid section is a runtime fallback instead of a 404.

### `/dashboard/settings/[section]`

- Good, because invalid sections can 404 and URLs are hierarchical.
- Bad, because `sites` would need a nested dynamic route for `[id]`, and the
  existing `[id]` page would move.

## Links

- Related ADR: [0011](0011-model-organization-roles-and-permissions.md),
  [0012](0012-layer-the-backend.md)
- Astryx template: `settings-sidebar` (`npm run astryx -- template settings-sidebar --skeleton`)

---

Adapted from the MADR template published by the
[architecture-decision-record](https://github.com/architecture-decision-record/architecture-decision-record)
project.
