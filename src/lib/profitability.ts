/**
 * Client-safe profitability vocabulary shared by the reports page, the sort
 * selector and the server-side sorter.
 */
export type ProfitabilitySort =
  | "contribution"
  | "margin"
  | "volume"
  | "unsold"
  | "loss";

export const PROFITABILITY_SORTS: readonly ProfitabilitySort[] = [
  "contribution",
  "margin",
  "volume",
  "unsold",
  "loss",
];

export function normalizeProfitabilitySort(
  value: string | string[] | undefined,
): ProfitabilitySort {
  const raw = Array.isArray(value) ? value[0] : value;
  return (PROFITABILITY_SORTS as readonly string[]).includes(raw ?? "")
    ? (raw as ProfitabilitySort)
    : "contribution";
}
