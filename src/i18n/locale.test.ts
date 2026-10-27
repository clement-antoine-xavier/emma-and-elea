import {resolveLocale} from "./locale";

describe("resolveLocale", () => {
  it("keeps a supported locale from the cookie", () => {
    expect(resolveLocale("fr")).toBe("fr");
    expect(resolveLocale("en")).toBe("en");
  });

  it("falls back to the default locale for missing or unknown values", () => {
    expect(resolveLocale(undefined)).toBe("en");
    expect(resolveLocale("")).toBe("en");
    expect(resolveLocale("de")).toBe("en");
    expect(resolveLocale("FR")).toBe("en");
  });
});
