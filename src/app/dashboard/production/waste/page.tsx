import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
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
    <PageShell
      title={tWaste("title")}
      intro={tWaste("intro")}
      actions={
        <Button
          label={t("backToProduction")}
          variant="secondary"
          href="/dashboard/production"
        />
      }
    >
      <WasteManager
        records={records}
        options={options}
        canWrite={canWrite}
      />
    </PageShell>
  );
}
