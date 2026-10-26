'use client';

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  isThemeModePreference,
  readThemeMode,
  themeModeStorageKey,
  writeThemeMode,
  type ThemeModePreference,
} from '@/lib/theme-mode';

type ThemeModeContextValue = {
  mode: ThemeModePreference;
  setMode: (mode: ThemeModePreference) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

// Reading storage in a layout effect keeps the stored preference applied
// before the next paint without rendering a different value during hydration.
// `useEffect` is the server-safe fallback so rendering emits no warning.
const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function ThemeModeProvider({children}: {children: ReactNode}) {
  const [mode, setModeState] = useState<ThemeModePreference>('system');

  useBrowserLayoutEffect(() => {
    setModeState(readThemeMode());
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== themeModeStorageKey) {
        return;
      }

      setModeState(
        isThemeModePreference(event.newValue) ? event.newValue : 'system',
      );
    }

    window.addEventListener('storage', handleStorage);

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setMode = useCallback((nextMode: ThemeModePreference) => {
    setModeState(nextMode);
    writeThemeMode(nextMode);
  }, []);

  const value = useMemo(() => ({mode, setMode}), [mode, setMode]);

  return <ThemeModeContext value={value}>{children}</ThemeModeContext>;
}

export function useThemeMode(): ThemeModeContextValue {
  const context = use(ThemeModeContext);

  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }

  return context;
}
