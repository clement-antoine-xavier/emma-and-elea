'use client';

import {useTransition} from 'react';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {hasLocale, useLocale, useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {setLocaleAction} from '@/app/actions/locale.actions';
import {routing} from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher');
  const activeLocale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const changeLocale = (value: string) => {
    if (
      value === activeLocale ||
      !hasLocale(routing.locales, value) ||
      isPending
    ) {
      return;
    }

    startTransition(async () => {
      const result = await setLocaleAction(value);

      if (result.ok) {
        router.refresh();
      }
    });
  };

  return (
    <SegmentedControl
      label={t('label')}
      size="sm"
      value={activeLocale}
      onChange={changeLocale}
    >
      {routing.locales.map((locale) => (
        <SegmentedControlItem key={locale} value={locale} label={t(locale)} />
      ))}
    </SegmentedControl>
  );
}
