import type {Metadata} from "next";
import {Center} from "@astryxdesign/core/Center";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {AuthForm} from "@/components/auth-form";
import {LocaleSwitcher} from "@/components/locale-switcher";
import {ThemeSwitcher} from "@/components/theme-switcher";
import {safeNextPath} from "@/lib/navigation";

// Session and search params are request data; keep the route blocking
// until the dashboard is migrated to a streamed shell.
export const instant = false;

type SignInPageProps = {
  searchParams: Promise<{next?: string | string[]}>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.signIn");

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
