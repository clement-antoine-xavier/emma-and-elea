import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {ListToolbar} from "@/components/list/list-toolbar";
import {ListPagination} from "@/components/list-pagination";
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
  const [t, tLots, tFilters, params] = await Promise.all([
    getTranslations("Stock"),
    getTranslations("Stock.lots"),
    getTranslations("Stock.lots.filters"),
    searchParams,
  ]);
  const view = await stockService.getLots(actor, params);

  const paginationParams: Record<string, string> = {};
  if (view.filters.search) paginationParams.search = view.filters.search;
  if (view.filters.includeEmpty) {
    paginationParams.includeEmpty = "true";
  }

  return (
    <PageShell
      title={tLots("title")}
      intro={tLots("intro")}
      actions={
        <Button
          label={t("backToStock")}
          variant="secondary"
          href="/dashboard/stock"
        />
      }
    >
      <ListToolbar
        search={{
          value: view.filters.search,
          label: tFilters("search"),
          placeholder: tFilters("searchPlaceholder"),
        }}
        scope={{
          key: "includeEmpty",
          label: tFilters("scope"),
          value: view.filters.includeEmpty ? "true" : "",
          options: [
            {value: "", label: tFilters("availableView")},
            {value: "true", label: tFilters("allView")},
          ],
        }}
        summary={tLots("count", {count: view.page.total})}
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
    </PageShell>
  );
}
