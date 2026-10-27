"use client";

import {Button} from '@astryxdesign/core/Button';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {authClient} from '@/lib/auth-client';

export function AuthStatus({
  showPrimaryCta = false,
  ctaOnly = false,
}: {
  showPrimaryCta?: boolean;
  ctaOnly?: boolean;
} = {}) {
  const router = useRouter();
  const t = useTranslations('Auth.status');
  const {data: session, isPending} = authClient.useSession();

  if (isPending) {
    return ctaOnly ? null : <Text type="supporting">{t('checking')}</Text>;
  }

  if (!session) {
    if (ctaOnly) {
      return (
        <Button
          href="/sign-up"
          variant="primary"
          size="sm"
          label={t('createAccount')}
        />
      );
    }

    return (
      <HStack gap={3} align="center" wrap="wrap">
        <Link href="/sign-in">{t('signIn')}</Link>
        {showPrimaryCta ? (
          <Button
            href="/sign-up"
            variant="primary"
            label={t('createAccount')}
          />
        ) : (
          <Link href="/sign-up">{t('createAccount')}</Link>
        )}
      </HStack>
    );
  }

  if (ctaOnly) {
    return (
      <Button
        href="/dashboard"
        variant="secondary"
        size="sm"
        label={t('dashboard')}
      />
    );
  }

  return (
    <HStack gap={3} align="center" wrap="wrap">
      <Text type="supporting">
        {t('signedInAs', {name: session.user.name || session.user.email})}
      </Text>
      <Link href="/dashboard">{t('dashboard')}</Link>
      <Button
        variant="secondary"
        label={t('signOut')}
        onClick={async () => {
          await authClient.signOut();
          router.refresh();
        }}
      />
    </HStack>
  );
}
