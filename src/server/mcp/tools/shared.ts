import {requireScopes} from "@modelcontextprotocol/server";
import type {McpDeps} from "../deps";

export type {McpDeps};

export const readScope = requireScopes("api:read");
export const writeScope = requireScopes("api:write");
export const executeScope = requireScopes("api:execute");
export const financeScope = requireScopes("api:finance");

/** Services take the URL-shaped filters used by pages; tools take numbers. */
export function pageFilters(input: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return {
    search: input.search,
    page: input.page?.toString(),
    pageSize: input.pageSize?.toString(),
  };
}

/** ISO calendar day to the UTC-midnight `Date` the services store. */
export function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function emptyToNull(value: string): string | null {
  return value.trim() === "" ? null : value;
}
