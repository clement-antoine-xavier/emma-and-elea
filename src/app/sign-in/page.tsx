import type {Metadata} from 'next';
import {Center} from '@astryxdesign/core/Center';
import {Stack} from '@astryxdesign/core/Stack';
import {AuthForm} from '@/components/auth-form';

export const metadata: Metadata = {
  title: 'Sign in · Emma & Elea',
};

export default function SignInPage() {
  return (
    <Center minHeight="100vh" padding={8}>
      <Stack width="100%" maxWidth={440}>
        <AuthForm mode="sign-in" />
      </Stack>
    </Center>
  );
}
