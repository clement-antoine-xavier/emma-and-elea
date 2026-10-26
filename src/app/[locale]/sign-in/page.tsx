import type {Metadata} from 'next';
import {Center} from '@astryxdesign/core/Center';
import {HStack} from '@astryxdesign/core/HStack';
import {Stack} from '@astryxdesign/core/Stack';
import {notFound} from 'next/navigation';
import {hasLocale} from 'next-intl';
import {getTranslations} from 'next-intl/server';
import {AuthForm} from '@/components/auth-form';
import {LocaleSwitcher} from '@/components/locale-switcher';
import {routing} from '@/i18n/routing';

type LocaleParams = {params: Promise<{locale: string}>};

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: 'Auth.signIn'});

  return {title: t('metadataTitle')};
}

export default function SignInPage() {
  return (
    <Center minHeight="100vh" padding={8}>
      <Stack gap={4} width="100%" maxWidth={440}>
        <HStack justify="end">
          <LocaleSwitcher />
        </HStack>
        <AuthForm mode="sign-in" />
      </Stack>
    </Center>
  );
}
