'use client';

import {useAppShellMobile} from '@astryxdesign/core/AppShell';
import {Divider} from '@astryxdesign/core/Divider';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {Stack} from '@astryxdesign/core/Stack';
import {TopNav, TopNavHeading, TopNavItem} from '@astryxdesign/core/TopNav';
import {Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {AuthStatus} from '@/components/auth-status';
import {LocaleSwitcher} from '@/components/locale-switcher';
import {ThemeSwitcher} from '@/components/theme-switcher';

export function SiteHeader() {
  const t = useTranslations('LandingPage.nav');
  const {isMobile, closeMobileNav} = useAppShellMobile();

  return (
    <TopNav
      label={t('label')}
      heading={<TopNavHeading heading="Emma & Éléa" headingHref="#top" />}
      startContent={
        isMobile ? (
          <Stack gap={4}>
            <Link href="#product" isStandalone onClick={closeMobileNav}>
              {t('product')}
            </Link>
            <Link href="#how-it-works" isStandalone onClick={closeMobileNav}>
              {t('howItWorks')}
            </Link>
            <Link href="#pricing" isStandalone onClick={closeMobileNav}>
              {t('pricing')}
            </Link>
            <Link href="#faq" isStandalone onClick={closeMobileNav}>
              {t('faq')}
            </Link>
            <Divider />
            <Stack gap={2}>
              <Text type="label" color="secondary">
                {t('preferences')}
              </Text>
              <LocaleSwitcher />
              <ThemeSwitcher />
            </Stack>
            <Divider />
            <AuthStatus showPrimaryCta />
          </Stack>
        ) : (
          <>
            <TopNavItem label={t('product')} href="#product" />
            <TopNavItem label={t('howItWorks')} href="#how-it-works" />
            <TopNavItem label={t('pricing')} href="#pricing" />
            <TopNavItem label={t('faq')} href="#faq" />
          </>
        )
      }
      endContent={
        isMobile ? (
          <AuthStatus ctaOnly />
        ) : (
          <HStack gap={2} align="center">
            <LocaleSwitcher />
            <ThemeSwitcher />
            <AuthStatus showPrimaryCta />
          </HStack>
        )
      }
    />
  );
}
