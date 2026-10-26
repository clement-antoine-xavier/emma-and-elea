"use client";

import {Button} from '@astryxdesign/core/Button';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/i18n/navigation';
import {authClient} from '@/lib/auth-client';

export function AuthStatus() {
  const router = useRouter();
  const t = useTranslations('Auth.status');
  const {data: session, isPending} = authClient.useSession();

  if (isPending) {
    return <Text type="supporting">{t('checking')}</Text>;
  }

  if (!session) {
    return (
      <HStack gap={3} align="center" wrap="wrap">
        <Link href="/sign-in">{t('signIn')}</Link>
        <Link href="/sign-up">{t('createAccount')}</Link>
      </HStack>
    );
  }

  return (
    <HStack gap={3} align="center" wrap="wrap">
      <Text type="supporting">
        {t('signedInAs', {name: session.user.name || session.user.email})}
      </Text>
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
