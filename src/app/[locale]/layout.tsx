import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {Geist, Geist_Mono} from 'next/font/google';
import {notFound} from 'next/navigation';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {getTranslations} from 'next-intl/server';
import {defaultThemeSlug} from '@/astryx-themes';
import {routing} from '@/i18n/routing';
import {themeModeInitScript} from '@/lib/theme-mode';
import '../globals.css';
import {Providers} from '../providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

type LocaleParams = {params: Promise<{locale: string}>};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: 'Metadata'});

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & {children: ReactNode}) {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

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
