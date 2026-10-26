import type {Metadata} from "next";
import {Center} from "@astryxdesign/core/Center";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {notFound} from "next/navigation";
import {hasLocale} from "next-intl";
import {getTranslations} from "next-intl/server";
import {AuthForm} from "@/components/auth-form";
import {LocaleSwitcher} from "@/components/locale-switcher";
import {ThemeSwitcher} from "@/components/theme-switcher";
import {routing} from "@/i18n/routing";
import {safeNextPath} from "@/lib/navigation";

// Session and search params are request data; keep the route blocking
// until the dashboard is migrated to a streamed shell.
export const instant = false;

type LocaleParams = {params: Promise<{locale: string}>};

type SignInPageProps = LocaleParams & {
  searchParams: Promise<{next?: string | string[]}>;
};

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: "Auth.signIn"});

  return {title: t("metadataTitle")};
}

export default async function SignInPage({searchParams}: SignInPageProps) {
  const {next} = await searchParams;

  return (
    <Center minHeight="100vh" padding={8}>
      <Stack gap={4} width="100%" maxWidth={440}>
        <HStack gap={4} align="center" justify="end" wrap="wrap">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </HStack>
        <AuthForm mode="sign-in" next={safeNextPath(next)} />
      </Stack>
    </Center>
  );
}
