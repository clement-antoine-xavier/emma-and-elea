'use client';

import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {useLocale, useTranslations} from 'next-intl';
import {usePathname, useRouter} from '@/i18n/navigation';
import {routing, type Locale} from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher');
  const activeLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <SegmentedControl
      label={t('label')}
      size="sm"
      value={activeLocale}
      onChange={(value) => {
        if (
          value === activeLocale ||
          !routing.locales.includes(value as Locale)
        ) {
          return;
        }

        router.replace(pathname, {
          locale: value as Locale,
          scroll: false,
        });
      }}
    >
      {routing.locales.map((locale) => (
        <SegmentedControlItem key={locale} value={locale} label={t(locale)} />
      ))}
    </SegmentedControl>
  );
}
