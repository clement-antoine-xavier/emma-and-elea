import type {Metadata} from "next";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {AuthForm} from "@/components/auth-form";
import {AuthSplitLayout} from "@/components/auth-split-layout";
import {LocaleSwitcher} from "@/components/locale-switcher";
import {ThemeSwitcher} from "@/components/theme-switcher";
import {safeNextPath} from "@/lib/navigation";

// Session and search params are request data; keep the route blocking
// until the dashboard is migrated to a streamed shell.
export const instant = false;

type SignUpPageProps = {
  searchParams: Promise<{next?: string | string[]}>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.signUp");

  return {title: t("metadataTitle")};
}

export default async function SignUpPage({searchParams}: SignUpPageProps) {
  const {next} = await searchParams;

  return (
    <AuthSplitLayout>
      <Stack gap={4} width="100%" maxWidth={440}>
        <HStack gap={4} align="center" justify="end" wrap="wrap">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </HStack>
        <AuthForm mode="sign-up" next={safeNextPath(next)} />
      </Stack>
    </AuthSplitLayout>
  );
}
