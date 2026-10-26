"use client";

import {useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, type UseFormSetError} from 'react-hook-form';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {Link} from '@astryxdesign/core/Link';
import {Stack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {authClient} from '@/lib/auth-client';
import {FormTextInput} from '@/components/form-text-input';
import {
  createAuthSchema,
  type AuthFormValues,
} from '@/lib/validation/auth';

type AuthMode = 'sign-in' | 'sign-up';

type AuthError = {
  code?: string;
  message?: string;
};

function applyAuthError(
  error: AuthError,
  setError: UseFormSetError<AuthFormValues>,
) {
  switch (error.code) {
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      setError('email', {
        type: 'server',
        message: 'An account with this email already exists.',
      });
      return;
    case 'PASSWORD_TOO_SHORT':
      setError('password', {
        type: 'server',
        message: 'Use at least 8 characters.',
      });
      return;
    case 'INVALID_EMAIL_OR_PASSWORD':
      setError('root', {
        type: 'server',
        message: 'Invalid email or password.',
      });
      return;
    default:
      setError('root', {
        type: 'server',
        message: error.message ?? 'Something went wrong. Please try again.',
      });
  }
}

export function AuthForm({mode}: {mode: AuthMode}) {
  const router = useRouter();
  const isSignUp = mode === 'sign-up';
  const schema = useMemo(() => createAuthSchema(mode), [mode]);

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: {errors, isSubmitting},
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {name: '', email: '', password: ''},
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: false,
  });

  async function onSubmit(values: AuthFormValues) {
    clearErrors('root');

    const result = isSignUp
      ? await authClient.signUp.email({
          name: values.name ?? '',
          email: values.email,
          password: values.password,
        })
      : await authClient.signIn.email({
          email: values.email,
          password: values.password,
        });

    if (result.error) {
      applyAuthError(result.error, setError);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <Card padding={6} width="100%">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap={5}>
          <Stack gap={1}>
            <Heading level={1}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Heading>
            <Text type="supporting">
              {isSignUp
                ? 'Start with an email and a password.'
                : 'Sign in to continue.'}
            </Text>
          </Stack>

          {errors.root?.message ? (
            <Banner
              status="error"
              title="Could not continue"
              description={errors.root.message}
            />
          ) : null}

          <FormLayout>
            {isSignUp ? (
              <FormTextInput
                control={control}
                name="name"
                label="Name"
                autoComplete="name"
                isRequired
              />
            ) : null}
            <FormTextInput
              control={control}
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              isRequired
            />
            <FormTextInput
              control={control}
              name="password"
              label="Password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              isRequired
            />
          </FormLayout>

          <Button
            variant="primary"
            label={isSignUp ? 'Create account' : 'Sign in'}
            type="submit"
            width="100%"
            isLoading={isSubmitting}
          />

          <Text type="supporting">
            {isSignUp ? 'Already have an account? ' : 'New here? '}
            <Link href={isSignUp ? '/sign-in' : '/sign-up'}>
              {isSignUp ? 'Sign in' : 'Create an account'}
            </Link>
          </Text>
        </Stack>
      </form>
    </Card>
  );
}
