# 0011. Model organization roles and permissions in code

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The product serves one artisan food business per organization, with several
sites (workshop, shop, warehouse) and people whose jobs differ: owners, managers,
production, purchasing, sales and staff. Cost prices, margins and supplier
prices are commercially sensitive, while everyone needs to record the work they
actually do. The application also needs platform-level support access without
turning support staff into invisible tenants.

The question: which roles exist, what may each one read and write, and where is
that enforced?

## Decision Drivers

- A small business must adopt the app without designing a permission matrix.
- Cost, margin and purchase-price data must not leak to staff, sales or auditors.
- The same rules must apply to server actions, pages and invitations.
- Better Auth's organization plugin already owns members, invitations and the
  active organization; custom rules must not break its endpoints.
- Tenant isolation must be enforceable and testable.
- Roles must be expressible in both the server and the browser without drift.

## Considered Options

- Fixed roles in code, with Better Auth access-control statements
- Organization-defined custom roles via `dynamicAccessControl`
- A single admin/member split with per-screen checks
- An external authorization service

## Decision Outcome

Chosen option: "Fixed roles in code", because it is predictable, testable and
auditable, and can evolve into custom roles later without changing call sites.

The model is:

- **Platform role** on `User.role`: `user` (default) or `support`. `support`
  may look up users and organizations, ban accounts and impersonate a user.
  It has no domain permission bypass: tenant data is only reachable through
  impersonation, and `Session.impersonatedBy` records it. `admin` is accepted
  as a legacy alias.
- **Organization role** on `Member.role`, exactly one per member:
  `owner`, `admin`, `production_manager`, `stock_manager`, `sales`, `staff`.
  `accountant` and `auditor` are reserved codes: present in the model and in
  the permission statements, hidden from the invitation picker until their
  read-only screens and exports exist.
- **Org-wide visibility.** Every member of an organization sees every site.
  `EmployeeProfile.siteId` remains a planning attribute, not a permission
  boundary.
- **Server-side redaction.** Cost, margin, purchase-price and labour-rate
  fields are omitted from queries for roles without `cost:read`; they never
  reach the browser.
- **Fail closed.** An unknown or missing role has no permissions. Legacy
  `member` rows are migrated to `staff`.
- **One active organization per user.** The database keeps Better Auth's
  many-to-many memberships, but the UI resolves one membership from the
  session and does not offer a switcher in v1.

Permissions are `resource:action` statements in `src/lib/permissions.ts`.
Better Auth's `organization`, `member`, `invitation`, `team` and `ac`
statements are kept alongside the domain resources so its endpoints keep
working. The role matrix is the single source for both `ac.newRole()` and the
application's `can()` helper.

### Positive Consequences

- One file defines the roles, the matrix, the plugin configuration and the
  server helpers.
- A test can assert the whole matrix, including reserved roles.
- Adding a domain screen means choosing an existing permission, not inventing
  a new authorization mechanism.
- Support access is explicit and attributable.

### Negative Consequences

- A business cannot invent a role such as "weekend baker" without a code change.
- A production manager who also sells needs the Admin role or a future
  multi-role upgrade.
- Field-level redaction is a convention per query until every cost-bearing
  screen selects fields explicitly; it must be reviewed as screens are added.
- Email delivery for invitations is not wired yet; v1 shares a link.

## Pros and Cons of the Options

### Fixed roles in code

- Good, because the matrix is typed, testable and reviewable in one diff.
- Good, because no role-management UI or role migration is needed.
- Bad, because it cannot model every real-world hat a small team wears.

### Organization-defined custom roles

- Good, because an owner can tailor access without a release.
- Bad, because permissions become data that every query and test must treat as
  dynamic, and a misconfigured role can expose costs.
- Bad, because it needs role CRUD, validation and support tooling in v1.

### Single admin/member split

- Good, because it is the smallest possible model.
- Bad, because it cannot protect margins from staff or separate purchasing from
  production, which is the core commercial requirement.

### External authorization service

- Good, because policies can be central and audited across products.
- Bad, because it adds a vendor, a network hop and a second source of truth for
  a single-tenant-per-business application.

## Links

- [Permission matrix](../permissions.md)
- [Roles and statements](../../src/lib/permissions.ts)
- [Access helpers](../../src/server/auth/actor.ts)
- [Auth configuration](../../src/lib/auth.ts)
- [ADR-0004](0004-use-better-auth-with-admin-and-organization.md)
