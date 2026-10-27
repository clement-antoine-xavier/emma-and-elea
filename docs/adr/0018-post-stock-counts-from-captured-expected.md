# 0018. Post stock counts from captured expected quantities

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-27

## Context and Problem Statement

A physical count compares what the ledger believes is in a site with what is
actually on the shelf. The count takes time, so the expected quantity has to be
captured when the session starts. Posting then has to adjust each lot and append
a signed `COUNT` movement without allowing the same draft to be posted twice.

## Decision Drivers

- The variance must be `counted − expected`, with the ledger's four-decimal
  rounding rules.
- `StockMovement` is append-only and lot-traceable (ADR-0010, ADR-0014).
- Counting and posting are different responsibilities: staff can count, a
  manager posts.
- One draft per site and day keeps the physical operation unambiguous.

## Considered Options

- Snapshot lot quantities into draft lines, edit counted quantities, then post
  one transaction that sets each lot and writes the non-zero variances
- Compute expected quantities at posting time from the live ledger
- Write one item-level adjustment and leave lots untouched
- Post each line independently as the counter enters it

## Decision Outcome

Chosen option: "Snapshot lot quantities into draft lines, edit counted
quantities, then post one transaction that sets each lot and writes the
non-zero variances", because it matches the physical workflow and keeps the
ledger append-only.

- **Draft creation** copies every `AVAILABLE` lot at the site with a positive
  remaining quantity. Each line stores `expectedQuantity`, an initial
  `countedQuantity` equal to it, the item stock unit and a zero variance. The
  application allows one draft per site and counted date.
- **Counting** updates `countedQuantity` and recalculates `variance` with
  `computeVariance` from `src/server/domain/stock-count.ts`. A role with
  `stock:count` may do this; a role without `stock:write` cannot post.
- **Posting** runs in one transaction. It builds the movements with
  `countMovements`, sets each lot's `quantityRemaining` to the counted value,
  appends one signed `COUNT` movement for each non-zero variance, and marks the
  session `POSTED`. Posting a second time is a state-transition error.
- **Lot-level only in v1.** The schema allows an item-level line with a null
  `lotId`, but the UI creates and posts lot lines only, because stock levels are
  derived from lot remaining quantities. Item-level adjustments need a
  different allocation rule and are deferred.
- **No concurrent movements during a count.** The stored expected quantity is
  the reference for the variance. If a receipt or dispatch lands between the
  snapshot and posting, the movement is still based on the captured expected
  quantity; the lot is nevertheless set to the physically counted value.

### Positive Consequences

- Counts are traceable to lots and produce the same signed movements as other
  postings.
- Counting and posting can be split between staff and a manager.
- The variance and rounding rules are unit-tested in the domain.

### Negative Consequences

- A long-running count can overlap later stock movements; operators should
  post the count before receiving or dispatching more stock.
- Item-level counts are not editable in the UI yet.
- The expected quantity is not refreshed if a manager wants to restart from the
  current ledger; they must cancel and create a new session.
