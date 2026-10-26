import {
  isThemeModePreference,
  readThemeMode,
  themeModeInitScript,
  themeModeStorageKey,
  writeThemeMode,
} from '@/lib/theme-mode';

describe('theme mode preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('accepts only the supported modes', () => {
    expect(isThemeModePreference('light')).toBe(true);
    expect(isThemeModePreference('dark')).toBe(true);
    expect(isThemeModePreference('system')).toBe(true);
    expect(isThemeModePreference('sepia')).toBe(false);
    expect(isThemeModePreference(null)).toBe(false);
  });

  it('defaults to system when nothing is stored', () => {
    expect(readThemeMode()).toBe('system');
  });

  it('reads a stored mode', () => {
    writeThemeMode('dark');

    expect(readThemeMode()).toBe('dark');
  });

  it('ignores an unsupported stored value', () => {
    window.localStorage.setItem(themeModeStorageKey, 'sepia');

    expect(readThemeMode()).toBe('system');
  });

  it('applies a stored mode before hydration', () => {
    window.localStorage.setItem(themeModeStorageKey, 'dark');

    Function(themeModeInitScript)();

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('leaves data-theme unset when following the system', () => {
    window.localStorage.setItem(themeModeStorageKey, 'system');

    Function(themeModeInitScript)();

    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});
