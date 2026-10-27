import {cookies} from "next/headers";
import requestConfig from "@/i18n/request";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("next-intl/server", () => ({
  getRequestConfig: (callback: () => unknown) => callback,
}));

const cookiesMock = cookies as unknown as jest.Mock;
// The mocked `getRequestConfig` returns our callback, which needs no params.
const loadConfig = requestConfig as unknown as () => Promise<unknown>;

function storeWithLocale(value: string | undefined) {
  cookiesMock.mockResolvedValue({
    get: (name: string) =>
      name === "NEXT_LOCALE" && value ? {name, value} : undefined,
  });
}

describe("i18n request config", () => {
  it("reads the locale from the NEXT_LOCALE cookie", async () => {
    storeWithLocale("fr");

    const config = (await loadConfig()) as {
      locale: string;
      messages: Record<string, unknown>;
    };

    expect(config.locale).toBe("fr");
    expect(config.messages).toHaveProperty("LandingPage");
  });

  it("defaults to English without a cookie", async () => {
    storeWithLocale(undefined);

    const config = (await loadConfig()) as {locale: string};

    expect(config.locale).toBe("en");
  });

  it("falls back to English for an unsupported cookie", async () => {
    storeWithLocale("de");

    const config = (await loadConfig()) as {locale: string};

    expect(config.locale).toBe("en");
  });

  it("loads the matching message catalogue", async () => {
    storeWithLocale("fr");

    const config = (await loadConfig()) as {
      messages: {LandingPage: {hero: {title: string}}};
    };

    expect(config.messages.LandingPage.hero.title).toBe(
      "Produire juste. Vendre mieux.",
    );
  });
});
