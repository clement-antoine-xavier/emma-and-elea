# 0025. Define product profitability as produced minus sold minus waste

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-29

## Context and Problem Statement

The product margin table only compares the latest recipe cost with the sale
price. The product promise is broader: show which products make money by
comparing profitability, volume, unsold quantities and loss rate over a period.
Those figures need an agreed definition, especially because retail sales
(`SalesDaily`) and wholesale dispatches (`Dispatch`) live in separate ledgers by
ADR-0015.

## Decision Drivers

- One definition shared by the reports page, the assistant and future exports.
- Retail and wholesale revenue must both count, without double counting.
- Units differ per line; every quantity must be expressed in the item stock unit.
- The figures are an operational estimate, not an accounting result.
- Waste and stock carried in from earlier periods must stay visible.

## Considered Options

- Only compare cost and sale price (the current margin table)
- Use sales revenue minus the cost of goods sold, without production or waste
- Use the four ledgers: production outputs, retail sales, dispatches and waste

## Decision Outcome

Chosen option: "Use the four ledgers", because it is the only definition that
answers “produced, sold, unsold and wasted” with data the app already records.

Definitions:

- **Produced**: `ProductionBatchOutput.quantity` for `COMPLETED` batches whose
  `completedAt` falls in the period.
- **Sold**: `SalesDaily.quantitySold` plus `DispatchLine.quantity` for
  `DISPATCHED` dispatches in the period.
- **Waste**: non-archived `WasteRecord.quantity` in the period.
- **Variance** = produced − sold − waste, kept signed.
- **Unsold** = max(0, variance). Stock carried in from a previous period can make
  the variance negative; the raw value stays visible.
- **Revenue**: daily sales revenue plus `DispatchLine.unitPrice × quantity`.
  Dispatches without a unit price are counted in quantity and flagged as
  “revenue incomplete”.
- **Contribution** = revenue − sold × latest unit cost. It is empty without a
  published cost snapshot.
- **Loss rate** = waste / produced; **unsold rate** = unsold / produced.
- Unsold is restricted to finished products; semi-finished items still appear in
  cost and waste but are not labelled unsold.
- Category roll-ups sum quantities and money, and weight the margin by costed
  revenue.

### Positive Consequences

- One screen answers “what did we make, sell, lose and earn per product”.
- Retail and wholesale are both counted.
- The estimate is explicitly labelled when revenue is incomplete.

### Negative Consequences

- Period-based unsold is not a stock count; it ignores opening stock.
- Items sold but not produced in the period show a negative variance.
- The aggregation reads four ledgers per view; large tenants will need
  item-level composite indexes (`sales_daily`, `production_batch_output`,
  `waste_record`). They are not added yet.

## Links

- Related ADR: ADR-0015 (separate dispatch stock from daily sales), ADR-0024
  (cost freshness)
- Source: `src/server/domain/profitability.ts`,
  `src/server/repositories/profitability.repository.ts`
