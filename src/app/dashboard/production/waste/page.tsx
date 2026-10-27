import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {WasteManager} from "@/components/production/waste-manager";
import {can} from "@/lib/permissions";
import {requirePermission} from "@/server/auth/actor";
import {productionService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Production.waste");

  return {title: t("metadataTitle")};
}

export default async function WastePage() {
  const actor = await requirePermission("waste:read");
  const t = await getTranslations("Production");
  const tWaste = await getTranslations("Production.waste");
  const [records, options] = await Promise.all([
    productionService.getWaste(actor),
    productionService.getWasteOptions(actor),
  ]);
  const canWrite = can(actor.role, "waste:write");

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={tWaste("title")}
            intro={tWaste("intro")}
            actions={
              <Button
                label={t("backToProduction")}
                variant="secondary"
                href="/dashboard/production"
              />
            }
          />
          <WasteManager
            records={records}
            options={options}
            canWrite={canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
