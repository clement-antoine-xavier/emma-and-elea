# 0010. Model the production domain around items, recipe versions and a stock ledger

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-26

## Context and Problem Statement

The product brief describes a single application covering recipes, production,
raw materials, stock, cost prices, margins, traceability, sales and teams. The
database currently holds only the seven Better Auth tables. The domain schema
must be designed before any of those features can be built, and the shape of
that schema decides whether costing stays reproducible and whether a lot can be
traced from a supplier to a customer.

How should the production domain be modelled so that cost history is stable,
traceability is answerable, and the first release remains buildable?

## Decision Drivers

- Cost prices must be reproducible: a past batch cannot change because a recipe
  or a supplier price changed afterwards.
- Traceability must be answerable in both directions for a recall.
- The shop floor enters data quickly; the schema must not require a wizard.
- Artisan businesses vary: some are one shop, some have a workshop and several
  points of sale.
- Better Auth owns and regenerates its own models, so domain data must not be
  added to them.
- Prisma 7 and PostgreSQL 18 must express the model without a second data layer.

## Considered Options

- A normalized aggregate model: `Organization` → `Site`, one `Item` table,
  versioned recipes, a lot-and-movement stock ledger, stored cost snapshots.
- Separate ingredient and product tables, mutable recipes, and cached stock
  levels.
- A generic attribute model (entity-attribute-value or JSON documents) for
  flexible recipes and stock.
- A full ERP suite, adopting an existing package and integrating around it.

## Decision Outcome

Chosen option: "A normalized aggregate model", documented in
[`docs/ERD.md`](../ERD.md), because it is the only option that keeps cost
history immutable while still letting the workshop change a recipe daily.

The decision has eight parts:

1. **Tenancy is `Organization` → `Site`.** `Organization` is the customer
   business; `Site` is a physical workshop, shop, warehouse or lab. Every
   tenant table stores `organizationId` explicitly, and physical tables also
   store `siteId`. This supports one shop today and a workshop plus three shops
   later without a migration.
2. **One `Item` table with an `ItemType` enum.** Raw materials, packaging,
   semi-finished preparations and finished products share price, stock, lot and
   allergen handling. A semi-finished item is produced by its own recipe and
   consumed by another, so croissant dough → croissant is a two-level graph
   with no special-case table.
3. **`Recipe` is identity, `RecipeVersion` is content.** Editing publishes a new
   version. `ProductionBatch.recipeVersionId` pins the version used, so cost,
   yield and traceability never move underneath a past batch.
4. **Costing is layered and stored.** Material, packaging, labour (operation
   time × `LabourRate`), energy (equipment power × time × `EnergyTariff`) and
   an overhead percentage. Each run is persisted as `CostSnapshot` +
   `CostSnapshotLine`, which is what lets the UI explain *why* a margin moved.
5. **Stock is a `Lot` plus an append-only `StockMovement` ledger.** Balances are
   derived; `Lot.quantityRemaining` is a cache reconciled by `StockCount`.
   Corrections are reversing movements, never edits.
6. **Lot genealogy is explicit.** `ProductionBatchInput` and
   `ProductionBatchOutput` connect consumed lots to produced lots, so a recall
   walks supplier lot → batch → finished lot → dispatch line → customer.
7. **Sales have two channels.** `Dispatch` and `DispatchLine` are lot-linked
   for B2B deliveries and are the traceable path. `SalesDaily` holds aggregated
   retail sales for forecasting and waste rate, unique per site, item, date and
   channel. `Item.defaultChannel` prevents double counting.
8. **Domain data never lives on Better Auth models.** Business settings go in
   `OrganizationSetting`, staff data in `EmployeeProfile` (one-to-one with
   `Member`), so `npm run auth:generate` can rewrite its block safely.

The schema is phased: 28 tables in Phase 1 (tenancy, catalogue, purchasing,
recipes, costing, stock, batches, waste, sales aggregates), 16 in Phase 2
(planning, orders, dispatch, team), 2 in Phase 3 (stock counts).

### Positive Consequences

- A batch's cost and composition are immutable and explainable line by line.
- Recalls are exact for dispatched goods and answerable per finished lot.
- The same item can be bought, transformed and sold without duplicating stock
  logic.
- Margin by product, by family and by period falls out of `CostSnapshot` and
  `SalesDaily` without a reporting database.
- Single-shop customers use one `Site`; multi-site customers need no schema
  change.
- Auth schema regeneration cannot delete domain data.

### Negative Consequences

- More tables and joins than a spreadsheet-shaped model: 46 domain tables.
- Publishing a recipe requires copy-and-switch rather than an in-place edit.
- Retail traceability stops at the finished lot, because counter sales are
  aggregated.
- Several invariants (recipe cycles, single published version, lot balances)
  need application checks or raw SQL constraints that Prisma cannot express.
- Costing needs reference data — units, labour rates, energy tariffs — before
  the first useful number appears.

## Pros and Cons of the Options

### Normalized aggregate model

Described in [`docs/ERD.md`](../ERD.md).

- Good, because cost history is immutable while recipes stay editable.
- Good, because one item table serves purchasing, production and sales.
- Good, because the lot ledger answers traceability with ordinary SQL.
- Good, because it fits Prisma 7 and PostgreSQL 18 without extensions.
- Bad, because it has the largest table count of the options.
- Bad, because some rules must be enforced outside the schema.

### Separate ingredient and product tables, mutable recipes, cached stock

- Good, because the vocabulary maps directly to how a baker speaks.
- Bad, because stock, price and lot logic would be duplicated.
- Bad, because mutable recipes rewrite the cost of past batches.
- Bad, because cached balances drift and break traceability.

### Generic attribute model

- Good, because a new product family needs no migration.
- Bad, because typed queries, constraints and indexes disappear.
- Bad, because cost arithmetic over JSON is unverifiable.
- Bad, because Better Auth's adapter expects ordinary Prisma models.

### Adopt a full ERP suite

- Good, because procurement, invoicing and payroll already exist.
- Bad, because the brief's differentiator is workshop simplicity, not breadth.
- Bad, because integration would subsume the product rather than support it.
- Bad, because per-tenant customisation would be driven by the vendor's model.

## Links

- [Entity–relationship diagram](../ERD.md)
- [Prisma schema](../../prisma/schema.prisma)
- Related ADR: [ADR-0003](0003-use-postgresql-18-and-prisma-7.md)
- Related ADR: [ADR-0004](0004-use-better-auth-with-admin-and-organization.md)
- Product brief: `Emma & Éléa.en.md` (external document)
