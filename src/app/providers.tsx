'use client';

import type {ReactNode} from 'react';
import Link from 'next/link';
import {LinkProvider} from '@astryxdesign/core/Link';
import {Theme} from '@astryxdesign/core/theme';
import {defaultThemeSlug, themes} from '../astryx-themes';

export function Providers({children}: {children: ReactNode}) {
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}
