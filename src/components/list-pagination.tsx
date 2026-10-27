"use client";

import {Pagination} from "@astryxdesign/core/Pagination";
import {usePathname, useRouter} from "next/navigation";

/**
 * Page links for a server-rendered list. Keeps the current filters and only
 * changes `page`; the Server Component reloads the window.
 */
export function ListPagination({
  page,
  pageSize,
  total,
  searchParams,
  label,
}: {
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string>;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (total <= pageSize) return null;

  return (
    <Pagination
      page={page}
      totalItems={total}
      pageSize={pageSize}
      variant="count"
      label={label}
      onChange={(nextPage) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", String(nextPage));
        router.push(`${pathname}?${params}`);
      }}
    />
  );
}
