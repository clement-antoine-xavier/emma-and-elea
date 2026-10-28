import type {Metadata} from "next";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {List, ListItem} from "@astryxdesign/core/List";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import Link from "next/link";
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

  const t = await getTranslations("Onboarding");

  return (
    <Center minHeight="100vh" padding={8}>
      <Stack gap={6} width="100%" maxWidth={1040}>
        <HStack gap={4} align="center" justify="between" wrap="wrap">
          <Link href="/">{t("home")}</Link>
          <HStack gap={4} align="center" justify="end" wrap="wrap">
            <ThemeSwitcher />
            <LocaleSwitcher />
          </HStack>
        </HStack>

        <Grid columns={{minWidth: 340, max: 2}} gap={8} align="start">
          <OnboardingForm />

          <Card padding={6}>
            <Stack gap={4}>
              <Stack gap={1}>
                <Heading level={2}>{t("aside.title")}</Heading>
                <Text type="supporting">{t("aside.intro")}</Text>
              </Stack>
              <List hasDividers>
                <ListItem
                  label={t("aside.workspaceTitle")}
                  description={t("aside.workspaceBody")}
                />
                <ListItem
                  label={t("aside.siteTitle")}
                  description={t("aside.siteBody")}
                />
                <ListItem
                  label={t("aside.teamTitle")}
                  description={t("aside.teamBody")}
                />
              </List>
            </Stack>
          </Card>
        </Grid>
      </Stack>
    </Center>
  );
}
