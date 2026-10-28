import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {HStack} from "@astryxdesign/core/HStack";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
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
    <PageShell
      title={t("title")}
      intro={t("intro")}
      actions={
        <HStack gap={2} wrap="wrap">
          <Button
            label={t("planningLink")}
            variant="primary"
            href="/dashboard/production/planning"
          />
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
    >
      <ProductionManager
        batches={view.batches}
        options={options}
        canWrite={view.canWrite}
      />
    </PageShell>
  );
}
