"use client";

import {useRouter} from 'next/navigation';
import {Button} from '@astryxdesign/core/Button';
import {HStack} from '@astryxdesign/core/HStack';
import {Link} from '@astryxdesign/core/Link';
import {Text} from '@astryxdesign/core/Text';
import {authClient} from '@/lib/auth-client';

export function AuthStatus() {
  const router = useRouter();
  const {data: session, isPending} = authClient.useSession();

  if (isPending) {
    return <Text type="supporting">Checking session…</Text>;
  }

  if (!session) {
    return (
      <HStack gap={3} align="center" wrap="wrap">
        <Link href="/sign-in">Sign in</Link>
        <Link href="/sign-up">Create account</Link>
      </HStack>
    );
  }

  return (
    <HStack gap={3} align="center" wrap="wrap">
      <Text type="supporting">
        Signed in as {session.user.name || session.user.email}
      </Text>
      <Button
        variant="secondary"
        label="Sign out"
        onClick={async () => {
          await authClient.signOut();
          router.refresh();
        }}
      />
    </HStack>
  );
}
