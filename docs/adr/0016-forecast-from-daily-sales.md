# 0016. Forecast from daily sales and keep plans as snapshots

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-27

## Context and Problem Statement

Planning needs a quantity suggestion per sellable item, but the organization
only has the sales history entered on the daily sales screen (ADR-0015). The
suggestion must be explainable, use the configured lookback and safety settings,
and survive as a snapshot once the planner starts adjusting it. Confirmed
orders due the same day are demand too, but they are wholesale commitments and
must not be averaged into counter sales.

## Decision Drivers

- Explainability: a planner must see the history window, the basis and the
  buffer behind a suggestion.
- No double counting between daily counter sales and confirmed orders.
- Plan lines are editable without rewriting the forecast engine.
- Execution must remain traceable: a production batch created from a plan keeps
  the link to its plan line.
- Pure, unit-testable date and rounding rules.

## Considered Options

- Average the same weekday from `SalesDaily`, fall back to the overall daily
  average, then apply safety and event uplift
- Average every day equally with no weekday seasonality
- Forecast from stock levels and minimums only
- Keep plans as live queries over forecast and orders instead of stored lines

## Decision Outcome

Chosen option: "Average the same weekday from `SalesDaily`, fall back to the
overall daily average, then apply safety and event uplift", because it is
explainable with the data the app already owns and keeps orders separate.

- **Forecast input** is `SalesDaily` for the selected site, converted to the
  item stock unit. The window is the configured `forecastHistoryDays` ending the
  day before the planned date. The same weekday total is divided by the number
  of that weekday in the window, so days without sales count as zero. When the
  weekday has no sales, the overall total is divided by all days in the window.
- **Buffers**: `forecastSafetyPct` and the expected uplift of events covering
  the date are added together before multiplying the average. A negative result
  is clamped to zero.
- **Orders are separate plan lines.** Unfulfilled lines from confirmed orders
  due that date are converted to the item stock unit and copied with their
  `orderLineId`. They are never added to the counter-sales average.
- **Plans are snapshots.** Creating a plan copies the selected forecast and
  order lines into `ProductionPlanLine`. Later sales or orders do not mutate a
  plan. One open plan (draft or confirmed) is allowed per site and day;
  confirming locks the lines; closing or cancelling is explicit.
- **Execution link**: creating a batch from a confirmed line converts the plan
  quantity to the recipe yield unit and sets `ProductionBatch.productionPlanLineId`.
  The unique column prevents creating two batches from the same line.

### Positive Consequences

- Suggestions can be explained from the board and are reproducible in tests.
- Counter sales and wholesale orders cannot double-count.
- Confirmed plans are stable even if the underlying sales or orders change.
- A batch always points back to the line that justified it.

### Negative Consequences

- The forecast ignores stock on hand in the suggested quantity; the board shows
  stock but leaves the decision to the planner.
- A history window with very few recorded days can produce noisy averages.
- Events affect the target date but historical event days are not excluded from
  the average yet.
