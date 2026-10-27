import type {Metadata} from "next";
import {Center} from "@astryxdesign/core/Center";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {redirect} from "next/navigation";
import {organizationService} from "@/server/services/container";
import {requireSession} from "@/server/auth/actor";
import {LocaleSwitcher} from "@/components/locale-switcher";
import {OnboardingForm} from "@/components/onboarding-form";
import {ThemeSwitcher} from "@/components/theme-switcher";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Onboarding");

  return {title: t("metadataTitle")};
}

export default async function OnboardingPage() {
  const actor = await requireSession();
  const {hasOrganization} = organizationService.getOnboardingState(actor);

  if (hasOrganization) {
    redirect("/dashboard");
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
