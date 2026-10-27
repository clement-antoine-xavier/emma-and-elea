# Bug hunt — findings from broadening the suite

Date: 2026-10-27

The coverage work was also a bug hunt. Every confirmed defect was fixed with a
regression test. Behaviour that looked suspicious but is a product decision is
documented here and pinned by a test so it cannot change silently.

## Fixed

### 1. `isoDateTimeString` accepted `24:00` and rolled into the next day

`new Date("2026-10-27T24:00")` is valid JavaScript and becomes the next day at
midnight, so a wall-clock validator built on `Date` alone accepted an impossible
time. The pattern now constrains hours, minutes and seconds.

- Regression test: `src/server/validators/shared.test.ts`
- File: `src/server/validators/shared.ts`

### 2. Customer archiving ignored the repository contract

`customerService.archiveCustomer` ignored the repository boolean, unlike every
other archive method. The current repository throws `NOT_FOUND` itself, so no
user-visible failure was observed; the guard makes the service robust to a
repository that returns `false` instead, which its interface allows.

- Regression test: `src/server/services/customer.service.test.ts`
- File: `src/server/services/customer.service.ts`

### 3. An unknown recipe version produced a 500 instead of a 404

`recipeService.getVersion` promised `| null` and the page turns `null` into
`notFound()`, but the service threw `NOT_FOUND` from `requireVersion`. The
route rendered an error instead of the 404 page.

- Regression tests: `src/server/services/recipe.service.extra.test.ts`
- File: `src/server/services/recipe.service.ts`

## Open questions (documented, not changed)

### Archived references are accepted by transactional services

`dailySalesService.recordDailySales`, `orderService.createOrder`,
`dispatchService.createDispatch` and their form options filter archived records
in the UI, but a direct action call can still post against an archived site or
customer. The repository `findById` / `find` queries do not filter
`archivedAt`, and the services do not check it.

- Pinned by tests in `daily-sales.service.test.ts` and `order.service.test.ts`.
- Decision needed: reject archived references in services (likely
  `INVALID_INPUT` or `NOT_FOUND`) or keep them valid for corrections.

### An inverted daily-sales range returns no rows

`dailySalesService.getDailySales` uses `from` and `to` as supplied; a crafted
`from > to` query produces an empty list instead of a validation error. The UI
never builds one. Pinned in `daily-sales.service.test.ts`.

### Non-sellable items appear in daily-sales and order pickers

`catalogRepository.listItemOptions` returns every active item, without
`isSellable`. Recording sales or orders for a raw material is therefore
possible. Forecasts only read recipe outputs, so planning is not polluted, but
the pickers may be broader than intended. Pinned indirectly in
`daily-sales.service.test.ts`; needs a product answer before filtering.
