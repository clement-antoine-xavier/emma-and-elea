import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DailySalesImport} from "@/components/sales/daily-sales-import";
import {DailySalesManager} from "@/components/sales/daily-sales-manager";
import {requirePermission} from "@/server/auth/actor";
import {dailySalesService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sales.daily");

  return {title: t("pageMetadataTitle")};
}

export default async function DailySalesPage() {
  const actor = await requirePermission("sales:read");
  const t = await getTranslations("Sales.daily");
  const [view, options] = await Promise.all([
    dailySalesService.getDailySales(actor, {}),
    dailySalesService.getOptions(actor),
  ]);

  return (
    <PageShell
      title={t("pageTitle")}
      intro={t("pageIntro")}
      actions={
        <Button
          label={t("backToSales")}
          variant="secondary"
          href="/dashboard/sales"
        />
      }
    >
      <DailySalesManager
        rows={view.rows}
        sites={options.sites}
        items={options.items}
        canWrite={view.canWrite}
      />

      <DailySalesImport canWrite={view.canWrite} />
    </PageShell>
  );
}
