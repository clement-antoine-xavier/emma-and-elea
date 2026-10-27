import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
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
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={t("pageTitle")}
            intro={t("pageIntro")}
            actions={
              <Button
                label={t("backToSales")}
                variant="secondary"
                href="/dashboard/sales"
              />
            }
          />
          <DailySalesManager
            rows={view.rows}
            sites={options.sites}
            items={options.items}
            canWrite={view.canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
