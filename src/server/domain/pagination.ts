/**
 * Page windows for list screens.
 *
 * Repositories receive an already-normalized `skip`/`take`, so a malformed
 * query string can never produce an unbounded `findMany`. The page number is
 * 1-based; `page` and `pageSize` are echoed back to the caller so links can be
 * rebuilt without recomputing anything.
 */

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type PageRequest = {
  page?: number | string | null;
  pageSize?: number | string | null;
};

export type NormalizedPage = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

function toInteger(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function normalizePage(
  request: PageRequest = {},
  options: {defaultSize?: number; maxSize?: number} = {},
): NormalizedPage {
  const defaultSize = options.defaultSize ?? DEFAULT_PAGE_SIZE;
  const maxSize = options.maxSize ?? MAX_PAGE_SIZE;

  const requestedPage = toInteger(request.page) ?? 1;
  const requestedSize = toInteger(request.pageSize) ?? defaultSize;

  const page = Math.max(1, requestedPage);
  const pageSize = Math.min(maxSize, Math.max(1, requestedSize));

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
