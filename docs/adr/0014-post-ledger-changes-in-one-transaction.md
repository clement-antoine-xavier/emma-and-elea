# 0014. Post ledger changes as one repository transaction

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-27

## Context and Problem Statement

Most domain actions write several rows that are only correct together: posting a
purchase receipt creates one lot and one `RECEIPT` movement per line; completing
a production batch writes inputs, consumption movements, output lots, output
movements and a cost snapshot; posting a dispatch writes movements and updates
`OrderLine.fulfilledQuantity`. A partial write would leave the stock ledger and
the documents disagreeing, and the ERD forbids repairing that with an edit:
`StockMovement` is append-only.

The backend is layered (ADR-0012): services enforce rules and cannot import
Prisma, while repositories own every query. The question is where a multi-row
write is coordinated, and how the rules stay testable without a database.

## Decision Drivers

- Atomicity: a posting either writes every row or none.
- Testability: quantity, sign and allocation rules must be unit-testable.
- The layer boundaries in ADR-0012: no Prisma in services, no business rules in
  repositories.
- PostgreSQL is the only transaction manager; no outbox or event bus in v1.
- Concurrency: two batches may consume the same lot at once.

## Considered Options

- A pure posting plan computed in the domain and written by one repository
  transaction
- Services calling `prisma.$transaction` directly
- Database triggers that derive movements from documents
- Sequential repository calls with compensating writes on failure

## Decision Outcome

Chosen option: "A pure posting plan computed in the domain and written by one
repository transaction", because it keeps rules testable while giving each
posting a single atomic write.

The flow is always the same:

```text
Entry point -> Service -> Domain calculator -> Posting plan
                                              |
                                 Repository.post(plan) -> withTransaction -> Prisma
```

- **Domain calculators** (`src/server/domain/`) are pure. They receive plain
  rows and return a plan: signed movement drafts, lot drafts, snapshot rows and
  the expected new quantities. `stock-count.ts` already does this for counts.
- **Services** authorize the actor, load the rows through repositories, call the
  calculator, and pass the plan to one repository method. They never import
  `@/lib/prisma`.
- **Repositories** expose intention-named methods (`postReceipt`, `postCount`,
  `completeBatch`) and wrap every write in `withTransaction`
  (`src/server/repositories/transaction.ts`). They may re-check a balance inside
  the transaction, but they do not decide business rules.
- **Balances** are read inside the transaction and checked against the plan
  before commit. A negative remaining quantity is rejected with
  `INSUFFICIENT_STOCK`; the database `CHECK` remains the last line of defence.
- **Concurrency** is handled with row locks where a balance is re-read
  (`SELECT ... FOR UPDATE` in a repository query) and with unique keys for
  document numbers. If two postings race, the loser fails with `CONFLICT` or
  `INSUFFICIENT_STOCK` and the caller retries with fresh data.
- **Idempotency**: a posting is guarded by its document status and a unique
  number; posting the same receipt twice is a state-transition error, not a
  duplicate movement.

### Positive Consequences

- Rules are unit-tested with plain inputs; only the transaction wrapper needs
  PostgreSQL.
- Every posting has one atomic commit point and one place to read its writes.
- Services stay free of Prisma, preserving the ESLint boundaries.
- Movement signs and lot allocation can be reviewed without reading SQL.

### Negative Consequences

- Each posting needs a plan type and a repository method; there is no generic
  "save everything" path.
- Repositories contain a little arithmetic to validate balances, even though
  the authoritative calculation is in the domain.
- Transaction tests need the real database, so they live in the E2E suite or in
  repository integration tests rather than Jest unit tests.

## Pros and Cons of the Options

### Pure posting plan with a repository transaction

- Good, because rules are testable and writes are atomic.
- Good, because the append-only ledger has exactly one write path.
- Bad, because plan DTOs add a layer between service and repository.

### Services call `prisma.$transaction`

- Good, because it is the shortest implementation.
- Bad, because services would import Prisma, breaking ADR-0012 and the ESLint
  rule that keeps the service layer framework-free.
- Bad, because rules and writes would be mixed in one file.

### Database triggers

- Good, because every writer, including future imports, would be consistent.
- Bad, because costing and allocation rules would move into SQL that the team
  cannot unit-test with Jest, and Prisma migrations would carry the logic.

### Sequential writes with compensation

- Good, because no long transaction is held.
- Bad, because compensation can itself fail and the append-only ledger cannot
  be edited back into agreement.

## Links

- [ADR-0012](0012-layer-the-backend.md)
- [Entity–relationship diagram](../ERD.md)
- [Transaction helper](../../src/server/repositories/transaction.ts)
- [Stock count calculator](../../src/server/domain/stock-count.ts)
