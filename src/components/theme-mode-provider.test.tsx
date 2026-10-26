import {act, renderHook} from '@testing-library/react';
import type {ReactNode} from 'react';
import {
  ThemeModeProvider,
  useThemeMode,
} from '@/components/theme-mode-provider';
import {themeModeStorageKey} from '@/lib/theme-mode';

function Wrapper({children}: {children: ReactNode}) {
  return <ThemeModeProvider>{children}</ThemeModeProvider>;
}

describe('ThemeModeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hydrates the stored mode and persists changes', () => {
    window.localStorage.setItem(themeModeStorageKey, 'light');

    const {result} = renderHook(() => useThemeMode(), {wrapper: Wrapper});

    expect(result.current.mode).toBe('light');

    act(() => result.current.setMode('dark'));

    expect(result.current.mode).toBe('dark');
    expect(window.localStorage.getItem(themeModeStorageKey)).toBe('dark');
  });

  it('falls back to system for an unsupported stored value', () => {
    window.localStorage.setItem(themeModeStorageKey, 'sepia');

    const {result} = renderHook(() => useThemeMode(), {wrapper: Wrapper});

    expect(result.current.mode).toBe('system');
  });
});
