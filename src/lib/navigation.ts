/**
 * Only accept same-origin, relative paths for post-auth redirects. Rejects
 * absolute URLs and protocol-relative URLs so `?next=` cannot become an open
 * redirect.
 */
export function safeNextPath(
  value: string | string[] | undefined | null,
): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

/**
 * Workspace rail routes. Kept in `src/lib` so both the server filter
 * (`dashboard.service.ts`) and the Client Component that renders the rail can
 * share the union without importing a server module.
 */
export type DashboardNavItem =
  | "overview"
  | "production"
  | "recipes"
  | "stock"
  | "catalog"
  | "purchasing"
  | "sales"
  | "reports"
  | "team"
  | "settings";

export function dashboardHref(item: DashboardNavItem): string {
  return item === "overview" ? "/dashboard" : `/dashboard/${item}`;
}

