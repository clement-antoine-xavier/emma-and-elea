import {hasLocale} from "next-intl";
import {routing, type Locale} from "./routing";

/** Cookie that stores the user's language preference. */
export const localeCookieName = "NEXT_LOCALE";

export const localeCookieOptions = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
} as const;

/**
 * Map an arbitrary cookie value to a supported locale. Unknown or missing
 * values fall back to the default locale so a stale or hand-edited cookie can
 * never break rendering.
 */
export function resolveLocale(value: string | undefined): Locale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}
