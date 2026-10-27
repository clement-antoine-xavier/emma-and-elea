import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
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
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={t("title")}
            intro={t("intro")}
            actions={
              <Button
                label={t("back")}
                variant="secondary"
                href="/dashboard/stock"
              />
            }
          />
          <StockCountManager
            counts={view.counts}
            sites={view.sites}
            canCount={view.canCount}
          />
        </Stack>
      </Center>
    </Section>
  );
}
