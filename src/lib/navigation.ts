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
