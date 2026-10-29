# 0024. Refresh stored costs on demand with an input fingerprint

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-29

## Context and Problem Statement

Recipe versions keep one or more `CostSnapshot` rows. The reports and the recipe
page read the latest snapshot, so a supplier price, labour rate, energy tariff or
overhead change does not move a published margin until a new version is created
or a batch is costed. The landing page promises that margins follow purchase
prices.

When should a stored cost be recomputed, and how does the UI know that the
snapshot is out of date?

## Decision Drivers

- The stored snapshot is the audit trail: it must keep the inputs and the result
  used at publish time.
- Recomputing every recipe on every read would multiply queries on the reports
  page.
- Recomputing inside a `GET` writes rows during a render, which the layering
  rules avoid.
- The cost engine is pure; the same input must always produce the same snapshot.
- Cost readers (accountant, auditor, production manager) need a way to refresh
  without gaining recipe-editing rights.

## Considered Options

- Recompute the cost live on every read and stop persisting snapshots
- Persist a fingerprint (`inputHash`) with each snapshot, detect staleness on
  read and expose an explicit refresh action
- Recompute all published recipes automatically when a purchase receipt is
  posted
- Recompute in a background job

## Decision Outcome

Chosen option: "Persist a fingerprint and refresh explicitly", because it keeps
the audit trail, avoids write-on-read and stays within the current deployment
(no worker or scheduler).

### Positive Consequences

- `costInputHash` in `src/server/domain/costing.ts` hashes every cost input
  (resolved prices, quantities, units, losses, rates, tariffs, overhead and
  yield) and ignores display labels and the sale price.
- Publishing and batch completion store the hash on `CostSnapshot.inputHash`.
  Snapshots written before this decision have `null` and are treated as stale.
- The recipe page compares the stored hash with a freshly computed one and shows
  a stale banner plus a “Recalculate cost” action.
- The reports page offers a bulk refresh of every published version and reports
  how many were refreshed and how many were skipped.
- Refresh inserts a **new** snapshot; the previous one stays for history.
- The sale price is excluded from the hash because it changes the margin, not
  the cost. Reports recompute the margin from the current sale price and the
  latest snapshot cost.
- The refresh action requires `cost:read`: it only appends derived, tenant-scoped
  rows and records `createdById`.

### Negative Consequences

- A stale snapshot is only refreshed when someone asks; there is no automatic
  invalidation on receipt posting.
- The recipe page performs one full costing pass per published version view to
  compare hashes.
- The bulk refresh runs sequentially and skips versions with missing prices,
  rates or tariffs instead of zeroing their costs.

## Pros and Cons of the Options

### Live recompute on read

- Good, because it is always current.
- Bad, because it loses the historical snapshot and multiplies queries.

### Fingerprint + explicit refresh

- Good, because it is deterministic, auditable and cheap to read.
- Bad, because freshness depends on a user action.

### Automatic refresh on receipt posting

- Good, because the reports stay current without thinking.
- Bad, because one receipt can touch many recipes and lengthens the posting
  transaction; it also hides the change from the user.

### Background job

- Good, because it keeps writes out of requests.
- Bad, because the deployment has no worker or scheduler yet.

## Links

- Related ADR: ADR-0010 (production domain), ADR-0012 (layered backend)
- Source: `src/server/domain/costing.ts`, `src/server/services/recipe.service.ts`
