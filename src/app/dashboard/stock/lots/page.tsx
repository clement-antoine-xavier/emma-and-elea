import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {ListPagination} from "@/components/list-pagination";
import {LotFilters} from "@/components/stock/lot-filters";
import {LotTable} from "@/components/stock/lot-table";
import {requirePermission} from "@/server/auth/actor";
import {stockService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Stock.lots");

  return {title: t("metadataTitle")};
}

type LotsSearchParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LotsPage({searchParams}: LotsSearchParams) {
  const actor = await requirePermission("stock:read");
  const t = await getTranslations("Stock");
  const tLots = await getTranslations("Stock.lots");
  const params = await searchParams;
  const view = await stockService.getLots(actor, params);

  const paginationParams: Record<string, string> = {};
  if (view.filters.search) paginationParams.search = view.filters.search;
  if (view.filters.includeEmpty) {
    paginationParams.includeEmpty = "true";
  }

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={tLots("title")}
            intro={tLots("intro")}
            actions={
              <Button
                label={t("backToStock")}
                variant="secondary"
                href="/dashboard/stock"
              />
            }
          />

          <LotFilters
            initialSearch={view.filters.search}
            initialIncludeEmpty={view.filters.includeEmpty}
          />

          {view.page.items.length === 0 ? (
            <Card padding={4}>
              <EmptyState
                title={tLots("emptyTitle")}
                description={tLots("emptyBody")}
              />
            </Card>
          ) : (
            <Stack gap={4}>
              <LotTable lots={view.page.items} />
              <ListPagination
                page={view.page.page}
                pageSize={view.page.pageSize}
                total={view.page.total}
                searchParams={paginationParams}
                label={tLots("paginationLabel")}
              />
            </Stack>
          )}
        </Stack>
      </Center>
    </Section>
  );
}
