import {cookies} from "next/headers";
import {getRequestConfig} from "next-intl/server";
import {localeCookieName, resolveLocale} from "./locale";

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(localeCookieName)?.value);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
