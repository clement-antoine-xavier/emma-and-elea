import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {StockCountManager} from "@/components/stock/stock-count-manager";
import {requirePermission} from "@/server/auth/actor";
import {stockCountService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Stock.counts");

  return {title: t("metadataTitle")};
}

export default async function StockCountsPage() {
  const actor = await requirePermission("stock:read");
  const t = await getTranslations("Stock.counts");
  const view = await stockCountService.getCounts(actor);

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      actions={
        <Button
          label={t("back")}
          variant="secondary"
          href="/dashboard/stock"
        />
      }
    >
      <StockCountManager
        counts={view.counts}
        sites={view.sites}
        canCount={view.canCount}
      />
    </PageShell>
  );
}
