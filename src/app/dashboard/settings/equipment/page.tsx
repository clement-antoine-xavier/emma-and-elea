import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {EquipmentManager} from "@/components/settings/equipment-manager";
import {requirePermission} from "@/server/auth/actor";
import {equipmentService, siteService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Equipment");

  return {title: t("metadataTitle")};
}

export default async function EquipmentPage() {
  const actor = await requirePermission("equipment:read");
  const t = await getTranslations("Equipment");
  const tSettings = await getTranslations("Settings");
  const [{equipment, canWrite}, {sites}] = await Promise.all([
    equipmentService.getEquipment(actor),
    siteService.getSites(actor),
  ]);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={t("title")}
            intro={t("intro")}
            actions={
              <Button
                label={tSettings("backToSettings")}
                variant="secondary"
                href="/dashboard/settings"
              />
            }
          />
          <EquipmentManager
            equipment={equipment}
            sites={sites}
            canWrite={canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
