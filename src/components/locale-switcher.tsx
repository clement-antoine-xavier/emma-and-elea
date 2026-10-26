'use client';

import {HStack} from '@astryxdesign/core/HStack';
import {Text} from '@astryxdesign/core/Text';
import {useLocale, useTranslations} from 'next-intl';
import {Link, usePathname} from '@/i18n/navigation';
import {routing} from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher');
  const activeLocale = useLocale();
  const pathname = usePathname();

  return (
    <HStack gap={2} align="center" wrap="wrap">
      <Text type="supporting" color="secondary">
        {t('label')}
      </Text>
      {routing.locales.map((locale) =>
        locale === activeLocale ? (
          <Text key={locale} type="supporting" weight="medium">
            {t(locale)}
          </Text>
        ) : (
          <Link key={locale} href={pathname} locale={locale}>
            <Text type="supporting" color="accent">
              {t(locale)}
            </Text>
          </Link>
        ),
      )}
    </HStack>
  );
}
