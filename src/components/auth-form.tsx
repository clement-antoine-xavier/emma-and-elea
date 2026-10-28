"use client";

import {useMemo} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, type UseFormSetError} from 'react-hook-form';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {Link} from '@astryxdesign/core/Link';
import {Stack} from '@astryxdesign/core/Stack';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {authClient} from '@/lib/auth-client';
import {FormTextInput} from '@/components/form-text-input';
import {
  createAuthSchema,
  type AuthFormValues,
  type AuthMode,
} from '@/server/validators/auth.schema';

type AuthError = {
  code?: string;
  message?: string;
};

type AuthErrorKey =
  | 'userExists'
  | 'passwordTooShort'
  | 'invalidCredentials'
  | 'generic';

function applyAuthError(
  error: AuthError,
  setError: UseFormSetError<AuthFormValues>,
  t: (key: AuthErrorKey) => string,
) {
  switch (error.code) {
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      setError('email', {
        type: 'server',
        message: t('userExists'),
      });
      return;
    case 'PASSWORD_TOO_SHORT':
      setError('password', {
        type: 'server',
        message: t('passwordTooShort'),
      });
      return;
    case 'INVALID_EMAIL_OR_PASSWORD':
      setError('root', {
        type: 'server',
        message: t('invalidCredentials'),
      });
      return;
    default:
      setError('root', {
        type: 'server',
        message: error.message ?? t('generic'),
      });
  }
}

export function AuthForm({mode, next}: {mode: AuthMode; next?: string}) {
  const router = useRouter();
  const tFields = useTranslations('Auth.fields');
  const tErrors = useTranslations('Auth.errors');
  const tValidation = useTranslations('Auth.validation');
  const tMode = useTranslations(
    mode === 'sign-up' ? 'Auth.signUp' : 'Auth.signIn',
  );
  const isSignUp = mode === 'sign-up';
  const schema = useMemo(
    () => createAuthSchema(mode, (key) => tValidation(key)),
    [mode, tValidation],
  );

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
      applyAuthError(result.error, setError, (key) => tErrors(key));
      return;
    }

    // The OAuth provider resumes an in-flight MCP authorization on session
    // creation and answers with the URL to continue at. A full navigation is
    // required: the client must leave the app for `/consent` or the client
    // callback.
    const continuation = (result.data as {url?: string} | null)?.url;
    if (continuation) {
      window.location.assign(continuation);
      return;
    }

    router.push(next ?? (isSignUp ? "/onboarding" : "/dashboard"));
    router.refresh();
  }

  return (
    <Card padding={6} width="100%">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap={5}>
          <Stack gap={1}>
            <Heading level={1}>{tMode('title')}</Heading>
            <Text type="supporting">{tMode('subtitle')}</Text>
          </Stack>

          {errors.root?.message ? (
            <Banner
              status="error"
              title={tErrors('bannerTitle')}
              description={errors.root.message}
            />
          ) : null}

          <FormLayout>
            {isSignUp ? (
              <FormTextInput
                control={control}
                name="name"
                label={tFields('name')}
                autoComplete="name"
                isRequired
              />
            ) : null}
            <FormTextInput
              control={control}
              name="email"
              label={tFields('email')}
              type="email"
              autoComplete="email"
              isRequired
            />
            <FormTextInput
              control={control}
              name="password"
              label={tFields('password')}
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              isRequired
            />
          </FormLayout>

          <Button
            variant="primary"
            label={tMode('submit')}
            type="submit"
            width="100%"
            isLoading={isSubmitting}
          />

          <Text type="supporting">
            {tMode('altPrompt')}
            <Link href={isSignUp ? '/sign-in' : '/sign-up'}>
              {tMode('altLink')}
            </Link>
          </Text>
        </Stack>
      </form>
    </Card>
  );
}
