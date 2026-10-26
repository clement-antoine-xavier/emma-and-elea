import type {Metadata} from "next";
import {Center} from "@astryxdesign/core/Center";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {notFound} from "next/navigation";
import {hasLocale} from "next-intl";
import {getLocale, getTranslations} from "next-intl/server";
import {redirect} from "@/i18n/navigation";
import {routing} from "@/i18n/routing";
import {getAccessContext, requireSession} from "@/lib/access";
import {LocaleSwitcher} from "@/components/locale-switcher";
import {OnboardingForm} from "@/components/onboarding-form";
import {ThemeSwitcher} from "@/components/theme-switcher";

// Session and search params are request data; keep the route blocking
// until the dashboard is migrated to a streamed shell.
export const instant = false;

type LocaleParams = {params: Promise<{locale: string}>};

export async function generateMetadata({
  params,
}: LocaleParams): Promise<Metadata> {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: "Onboarding"});

  return {title: t("metadataTitle")};
}

export default async function OnboardingPage() {
  await requireSession();

  const context = await getAccessContext();

  if (context?.membership) {
    redirect({href: "/dashboard", locale: await getLocale()});
  }

  return (
    <Center minHeight="100vh" padding={8}>
      <Stack gap={4} width="100%" maxWidth={480}>
        <HStack gap={4} align="center" justify="end" wrap="wrap">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </HStack>
        <OnboardingForm />
      </Stack>
    </Center>
  );
}
