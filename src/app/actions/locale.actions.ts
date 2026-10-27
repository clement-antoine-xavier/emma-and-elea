"use server";

import {cookies} from "next/headers";
import {hasLocale} from "next-intl";
import {localeCookieName, localeCookieOptions} from "@/i18n/locale";
import {routing} from "@/i18n/routing";

export type SetLocaleActionResult = {ok: true} | {ok: false};

/**
 * Persist the user's language choice. The caller refreshes the route so the
 * Server Components pick up the new request locale.
 */
export async function setLocaleAction(
  locale: string,
): Promise<SetLocaleActionResult> {
  if (!hasLocale(routing.locales, locale)) {
    return {ok: false};
  }

  (await cookies()).set(localeCookieName, locale, localeCookieOptions);

  return {ok: true};
}
