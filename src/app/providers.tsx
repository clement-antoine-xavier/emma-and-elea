'use client';

import type {ReactNode} from 'react';
import {LinkProvider} from '@astryxdesign/core/Link';
import {Theme} from '@astryxdesign/core/theme';
import {ThemeModeProvider, useThemeMode} from '@/components/theme-mode-provider';
import {Link} from '@/i18n/navigation';
import {defaultThemeSlug, themes} from '../astryx-themes';

function ThemedApp({children}: {children: ReactNode}) {
  const {mode} = useThemeMode();

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
