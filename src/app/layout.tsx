import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {Geist, Geist_Mono} from 'next/font/google';
import {NextIntlClientProvider} from 'next-intl';
import {getLocale, getTranslations} from 'next-intl/server';
import {defaultThemeSlug} from '@/astryx-themes';
import {themeModeInitScript} from '@/lib/theme-mode';
import './globals.css';
import {Providers} from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// The locale comes from the NEXT_LOCALE cookie, so every route renders per
// request rather than shipping a prerendered shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function RootLayout({children}: {children: ReactNode}) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-astryx-theme={defaultThemeSlug}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{__html: themeModeInitScript}}
          suppressHydrationWarning
        />
      </head>
      <body>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
