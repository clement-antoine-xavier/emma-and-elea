export const themeModeStorageKey = 'theme-mode';

export const themeModes = ['light', 'dark', 'system'] as const;

export type ThemeModePreference = (typeof themeModes)[number];

export function isThemeModePreference(
  value: unknown,
): value is ThemeModePreference {
  return (
    typeof value === 'string' &&
    (themeModes as readonly string[]).includes(value)
  );
}

export function readThemeMode(): ThemeModePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }

  try {
    const storedMode = window.localStorage.getItem(themeModeStorageKey);

    return isThemeModePreference(storedMode) ? storedMode : 'system';
  } catch {
    return 'system';
  }
}

export function writeThemeMode(mode: ThemeModePreference): void {
  try {
    window.localStorage.setItem(themeModeStorageKey, mode);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the
    // in-memory preference still applies for the current page.
  }
}

/**
 * Blocking script that applies the stored preference before first paint.
 *
 * The root layout renders this inline in `<head>` so `<html data-theme>`
 * matches the user's choice before React hydrates. `Theme` keeps the
 * attribute in sync afterwards. "system" intentionally leaves the attribute
 * unset so Astryx reset.css falls back to `color-scheme: light dark`.
 */
export const themeModeInitScript = `(function(){try{var mode=localStorage.getItem(${JSON.stringify(themeModeStorageKey)});if(mode==="light"||mode==="dark"){document.documentElement.setAttribute("data-theme",mode);}}catch(error){}})();`;
