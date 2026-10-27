'use client';

import {useEffect, type ReactNode} from 'react';
import {LinkProvider} from '@astryxdesign/core/Link';
import {Theme} from '@astryxdesign/core/theme';
import Link from 'next/link';
import {ThemeModeProvider, useThemeMode} from '@/components/theme-mode-provider';
import {defaultThemeSlug, themes} from '../astryx-themes';

function ThemedApp({children}: {children: ReactNode}) {
  const {mode} = useThemeMode();

  useEffect(() => {
    // Read by end-to-end tests before they interact with a form or button.
    document.documentElement.dataset.hydrated = 'true';

    return () => {
      delete document.documentElement.dataset.hydrated;
    };
  }, []);

  return (
    <Theme theme={themes[defaultThemeSlug]} mode={mode}>
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}

export function Providers({children}: {children: ReactNode}) {
  return (
    <ThemeModeProvider>
      <ThemedApp>{children}</ThemedApp>
    </ThemeModeProvider>
  );
}
