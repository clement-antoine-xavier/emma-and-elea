/**
 * Site codes appear in lot numbers (`{site}-{yyMMdd}-{seq}`), so they are short
 * and stable. Derived codes are a starting point the owner can override.
 */
export const SITE_CODE_PATTERN = /^[A-Z0-9]{2,8}$/;

export function siteCodeFromName(name: string): string {
  const letters = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return letters.slice(0, 3) || "ATL";
}

export function normalizeSiteCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidSiteCode(value: string): boolean {
  return SITE_CODE_PATTERN.test(value);
}
