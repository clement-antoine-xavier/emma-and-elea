import type {Metadata} from 'next';
import {Center} from '@astryxdesign/core/Center';
import {Stack} from '@astryxdesign/core/Stack';
import {AuthForm} from '@/components/auth-form';

export const metadata: Metadata = {
  title: 'Create account · Emma & Elea',
};

export default function SignUpPage() {
  return (
    <Center minHeight="100vh" padding={8}>
      <Stack width="100%" maxWidth={440}>
        <AuthForm mode="sign-up" />
      </Stack>
    </Center>
  );
}
