import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {SiteManager} from "@/components/settings/site-manager";
import {requirePermission} from "@/server/auth/actor";
import {siteService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sites");

  return {title: t("metadataTitle")};
}

export default async function SitesPage() {
  const actor = await requirePermission("site:read");
  const t = await getTranslations("Sites");
  const tSettings = await getTranslations("Settings");
  const {sites, canWrite} = await siteService.getSites(actor);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={t("title")}
            intro={t("intro", {organization: actor.organization.name})}
            actions={
              <Button
                label={tSettings("backToSettings")}
                variant="secondary"
                href="/dashboard/settings"
              />
            }
          />
          <SiteManager sites={sites} canWrite={canWrite} />
        </Stack>
      </Center>
    </Section>
  );
}
