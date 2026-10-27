import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {ListPagination} from "@/components/list-pagination";
import {DispatchManager} from "@/components/sales/dispatch-manager";
import {requirePermission} from "@/server/auth/actor";
import {dispatchService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sales.dispatches");

  return {title: t("pageMetadataTitle")};
}

type DispatchSearchParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DispatchesPage({
  searchParams,
}: DispatchSearchParams) {
  const actor = await requirePermission("dispatch:read");
  const t = await getTranslations("Sales.dispatches");
  const params = await searchParams;
  const [view, options] = await Promise.all([
    dispatchService.getDispatches(actor, params),
    dispatchService.getOptions(actor),
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
          <DispatchManager
            dispatches={view.page.items}
            customers={options.customers}
            sites={options.sites}
            orders={options.orders}
            canWrite={view.canWrite}
          />
          <ListPagination
            page={view.page.page}
            pageSize={view.page.pageSize}
            total={view.page.total}
            searchParams={{}}
            label={t("paginationLabel")}
          />
        </Stack>
      </Center>
    </Section>
  );
}
