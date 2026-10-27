import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {ProductionManager} from "@/components/production/production-manager";
import {requirePermission} from "@/server/auth/actor";
import {productionService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Production");

  return {title: t("metadataTitle")};
}

export default async function ProductionPage() {
  const actor = await requirePermission("production:read");
  const t = await getTranslations("Production");
  const [view, options] = await Promise.all([
    productionService.getBatches(actor),
    productionService.getOptions(actor),
  ]);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={t("title")}
            intro={t("intro")}
            actions={
              <HStack gap={2} wrap="wrap">
                <Button
                  label={t("wasteLink")}
                  variant="secondary"
                  href="/dashboard/production/waste"
                />
                <Button
                  label={t("recipesLink")}
                  variant="secondary"
                  href="/dashboard/recipes"
                />
              </HStack>
            }
          />
          <ProductionManager
            batches={view.batches}
            options={options}
            canWrite={view.canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
