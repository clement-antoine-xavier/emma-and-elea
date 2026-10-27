import {
  isThemeModePreference,
  readThemeMode,
  themeModeInitScript,
  themeModeStorageKey,
  writeThemeMode,
} from "@/lib/theme-mode";

describe("theme mode fallbacks", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("defaults to system when storage cannot be read", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(readThemeMode()).toBe("system");
  });

  it("does not throw when storage cannot be written", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => writeThemeMode("dark")).not.toThrow();
  });

  it("ignores an unsupported stored value in the init script", () => {
    window.localStorage.setItem(themeModeStorageKey, "sepia");

    Function(themeModeInitScript)();

    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("applies the light mode before hydration", () => {
    window.localStorage.setItem(themeModeStorageKey, "light");

    Function(themeModeInitScript)();

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("accepts only supported values", () => {
    expect(isThemeModePreference("system")).toBe(true);
    expect(isThemeModePreference("SYSTEM")).toBe(false);
    expect(isThemeModePreference(1)).toBe(false);
  });
});
