# Roles and permissions

- Status: Implemented
- Last updated: 2026-10-29
- Decision: [ADR-0011](adr/0011-model-organization-roles-and-permissions.md)
- Source of truth: [`src/lib/permissions.ts`](../src/lib/permissions.ts)

This document describes who can do what. The TypeScript matrix is normative; if
this page and the code disagree, fix the page.

## Two role axes

| Axis | Stored on | Values | Purpose |
| --- | --- | --- | --- |
| Platform | `User.role` | `user`, `support` (legacy alias: `admin`) | Cross-tenant support, bans, impersonation. No silent tenant data access. |
| Organization | `Member.role` | `owner`, `admin`, `production_manager`, `stock_manager`, `sales`, `staff`, plus reserved `accountant`, `auditor` | Day-to-day access inside one business. |

A member holds **one** organization role. The organization is resolved from the
session and `member` table; a route parameter or form field never selects the
tenant.

## Organization roles

| Code | Label | Intent |
| --- | --- | --- |
| `owner` | Owner / Propriétaire | Full control, including ownership transfer and the last word on the tenant. |
| `admin` | Admin / Gérant | Runs the business. Manages everyone except owners. Cannot delete the tenant. |
| `production_manager` | Production manager / Responsable production | Recipes, production, planning, team, costs and margins. |
| `stock_manager` | Stock & purchasing / Responsable stock et achats | Catalog, suppliers, receipts, stock, counts, waste, purchase prices. |
| `sales` | Sales / Commercial | Customers, orders, dispatches, daily sales, sale prices. |
| `staff` | Staff / Équipier | Own work, batch execution, waste and count entry, sale prices only. |
| `accountant` | Accountant / Comptable | Reserved. Read-only finance, including costs and margins. |
| `auditor` | Auditor / Contrôleur | Reserved. Read-only traceability, never costs or margins. |

Reserved roles exist in the matrix so their screens can ship without a data
migration. They are excluded from invitations and role pickers.

## Bearer access tokens (MCP and REST API)

MCP hosts and REST API clients receive an OAuth access token instead of a session
cookie. The token carries coarse, resource-neutral scopes; the member role stays
authoritative. Every call is the intersection of the two (`src/lib/scopes.ts`,
ADR-0020 and ADR-0021).

| Scope | Grants (when the role also has the permission) |
| --- | --- |
| `api:read` | every `*:read` permission used by the tools |
| `api:write` | draft creation and edits: catalog, suppliers, receipts, orders, dispatches, plans, waste |
| `api:execute` | `production:execute`, `task:execute`, `stock:count` — posting stock and running batches |
| `api:finance` | `report:read`, `cost:read`, `report:finance`, `report:traceability` |

Consent is stored per organization. `resolveTokenActor` re-reads the membership on
every request, so a role change applies on the next call even while the JWT is
still valid. Tokens are audience-bound: a token for the MCP resource (`/mcp`) is
rejected by the REST API (`/api`) and vice versa. Server Components and Server
Actions keep using the session cookie and the same `assertPermission` guard.

## Matrix

Legend: **W** = write, **R** = read, **—** = no access, **own** = only the
caller's own records or work.

| Capability | Owner | Admin | Prod. mgr | Stock mgr | Sales | Staff | Acct.\* | Auditor\* |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Organization settings | W | W | R | R | R | R | R | R |
| Delete organization | W | — | — | — | — | — | — | — |
| Sites | W | W | R | R | R | R | R | R |
| Equipment | W | W | W | R | — | — | — | — |
| Members and invitations | W | W (not owners) | — | — | — | — | — | — |
| Ownership transfer | W | — | — | — | — | — | — | — |
| Items, categories, units, allergens | W | W | W | W | R (sale price) | R (sale price, VAT) | R | R |
| Suppliers and supplier prices | W | W | R | W | — | — | R | R |
| Purchase receipts | W | W | R | W | — | — | R | R |
| Recipes and versions | W | W | W | R (no cost) | — | R (no cost) | R | R (no cost) |
| Costs, margins, labour rates | R | R | R | — | — | — | R | — |
| Production plans and batches | W | W | W | R | R (availability) | execute own | — | R |
| Tasks | W | W | W | R | R | execute own | — | R |
| Stock and lots | W | W | W | W | R (availability) | R | — | R |
| Stock counts | W | W | W | W | — | create draft | — | R |
| Waste | W | W | W | W | — | entry | — | R |
| Customers | W | W | R | — | W | — | R | — |
| Orders | W | W | R | R | W | — | R | R |
| Dispatches | W | W | R | R (prepares lots) | W | — | R | R |
| Daily sales | W | W | R | — | W | — | R | — |
| Team, skills, shifts | W | W | W | R | own | own | — | — |
| Absences | decide | decide | decide own team | request own | request own | request own | — | — |
| Local events | W | W | W | R | W | R | R | R |
| Reports | all | all | ops + finance | stock | own sales | — | finance | traceability |

\* Reserved role, hidden from the UI until its screens exist.

Additional rules:

- Staff and Sales see **sale prices**, never purchase prices, recipe costs or
  margins.
- The reports page shows cost, margin, waste-cost and production-cost sections
  only to roles with `report:finance`. Other report readers see batch yields and
  stock alerts.
- Accountant and Auditor never write.
- An Admin cannot change, demote or remove an Owner; only an Owner can.
- A member cannot change their own role or remove themselves.
- The last Owner cannot be demoted or removed (Better Auth enforces this).
- Inviting or assigning an Owner is an Owner-only action.
- Platform `support` sees tenant data only while impersonating.

## Permission statements

| Resource | Actions |
| --- | --- |
| `organization` | `read`, `update`, `delete` |
| `member` | `read`, `create`, `update`, `delete` |
| `invitation` | `read`, `create`, `cancel` |
| `site` | `read`, `write` |
| `equipment` | `read`, `write` |
| `catalog` | `read`, `write` |
| `supplier` | `read`, `write` |
| `purchasing` | `read`, `write` |
| `recipe` | `read`, `write`, `publish` |
| `cost` | `read` |
| `production` | `read`, `write`, `execute` |
| `task` | `read`, `write`, `execute` |
| `stock` | `read`, `write`, `count` |
| `waste` | `read`, `write` |
| `customer` | `read`, `write` |
| `order` | `read`, `write` |
| `dispatch` | `read`, `write` |
| `sales` | `read`, `write` |
| `team` | `read`, `write`, `self` |
| `absence` | `read`, `request`, `decide` |
| `event` | `read`, `write` |
| `report` | `read`, `finance`, `traceability` |

`member:create`, `member:update`, `member:delete`, `invitation:create`,
`invitation:cancel`, `organization:update` and `organization:delete` are also
used by Better Auth's own organization endpoints and must stay in the matrix.

## Enforcement

- Pages call `requireSession`, `requireOrganizationActor`,
  `requirePermission` or `requireAnyPermission` from
  `src/server/auth/actor.ts`. Unknown roles fail closed.
- Services re-check the permission and the target's organization; Server
  Actions only validate input, call a service, and map domain errors to
  translation keys.
- Tenant-scoped repositories always receive the `organizationId` resolved from
  the session, never from the request body.
- Cost-bearing queries select fields explicitly and omit cost columns unless
  the role has `cost:read`. The browser is never trusted to hide them.
- Client-side checks (`can()`) only shape the UI. They are not the enforcement
  boundary.
- ESLint forbids `src/app/**` from importing Prisma, Better Auth or
  repositories, and forbids `src/components/**` from importing server layers.

See [ADR-0012](adr/0012-layer-the-backend.md) for the layer boundaries.

## Onboarding and invitations

- Sign-up creates a user only. A user without a membership is sent to
  `/onboarding`, creates an organization, and becomes its Owner.
- Invitations are created with an explicit role from the assignable set and are
  shared as links (`/accept-invitation/{id}`) until an email provider is chosen.
- Accepting an invitation sets the active organization on the session.
- Organization deletion is disabled in v1; a soft-delete flow can re-enable it.
