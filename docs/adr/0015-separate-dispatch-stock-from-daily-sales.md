# 0015. Record dispatches in the stock ledger and daily sales separately

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-27

## Context and Problem Statement

The commercial chain produces two different facts: a dispatch moves physical
stock out of a site, while daily takings record what was sold over the counter.
A single order can be dispatched in several deliveries, and retail sales often
leave the shop without an order at all. Writing revenue from a dispatch would
double-count wholesale orders that also appear in the daily takings, while
writing stock movements from a daily entry would break traceability because a
takings figure has no lot.

The question is how to keep stock, order fulfilment, revenue and margin
reporting consistent without inventing a second ledger.

## Decision Drivers

- Lot traceability: every outgoing quantity must name the lot it came from.
- Atomic posting (ADR-0014): a dispatch either writes all of its movements or
  none.
- No double counting between dispatch value and daily revenue.
- One revenue source for the reports, whatever the channel.
- The layer boundaries in ADR-0012.

## Considered Options

- Post negative `DISPATCH` movements from the dispatch and leave `SalesDaily`
  as an independent manual entry
- Derive `SalesDaily` rows from posted dispatches
- Treat dispatches as the only sales record and drop `SalesDaily`
- Store revenue on the dispatch and reconcile it later

## Decision Outcome

Chosen option: "Post negative `DISPATCH` movements from the dispatch and leave
`SalesDaily` as an independent manual entry", because it keeps physical
traceability and commercial reporting separate while giving each a single
owner.

- **Dispatch posting** is one repository transaction. For each line it checks
  and decrements `Lot.quantityRemaining`, writes a negative `DISPATCH`
  movement, and updates the matching `OrderLine.fulfilledQuantity`. The
  dispatched quantity is converted from the lot's stock unit to the order
  line's unit before it is added. The order becomes `READY` while any line is
  short and `DELIVERED` when every line is fulfilled. Posting never writes
  `SalesDaily`.
- **Daily sales** are entered per site, item, business date and channel. The
  unique key `[siteId, itemId, businessDate, channel]` makes the entry an
  upsert, so re-entering the same day corrects it instead of duplicating it.
  `SalesDaily` is the only revenue source for sales reporting.
- **Stock and revenue meet in reports, not in writes.** Reports compare period
  waste and production cost with the latest published cost snapshot; product
  margin uses the current output item sale price against that snapshot cost,
  not the margin stored when the version was published.
- **Permissions stay split**: `dispatch:write` moves stock from lots;
  `sales:write` records takings. A role may hold one without the other.

### Positive Consequences

- The stock ledger stays append-only and lot-traceable, and a dispatch is
  idempotent through its document status.
- Revenue is never inferred from a stock movement, so wholesale dispatches and
  counter takings cannot double-count.
- Correcting a day's takings is a safe upsert.
- Margin reporting reflects the current sale price without rewriting history.

### Negative Consequences

- Daily takings must be entered even when an order was dispatched; the two
  screens do not fill each other in.
- The order is `READY` or `DELIVERED` from quantities only, not from a separate
  delivery confirmation.
- Reports can show revenue without a matching dispatch, which is expected for
  retail and must be explained in the report copy.
