import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {ListToolbar} from "@/components/list/list-toolbar";
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
  const [t, tFilters, tStatus, params] = await Promise.all([
    getTranslations("Sales.dispatches"),
    getTranslations("Sales.dispatches.filters"),
    getTranslations("Sales.statuses"),
    searchParams,
  ]);
  const [view, options] = await Promise.all([
    dispatchService.getDispatches(actor, params),
    dispatchService.getOptions(actor),
  ]);

  const paginationParams: Record<string, string> = {};
  if (view.filters.search) paginationParams.search = view.filters.search;
  if (view.filters.status) paginationParams.status = view.filters.status;

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
      <ListToolbar
        search={{
          value: view.filters.search,
          label: tFilters("search"),
          placeholder: tFilters("searchPlaceholder"),
        }}
        scope={{
          key: "status",
          label: tFilters("scope"),
          value: view.filters.status ?? "",
          options: [
            {value: "", label: tFilters("allView")},
            {value: "DRAFT", label: tStatus("DRAFT")},
            {value: "DISPATCHED", label: tStatus("DISPATCHED")},
            {value: "CANCELLED", label: tStatus("CANCELLED")},
          ],
        }}
        summary={t("count", {count: view.page.total})}
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
        searchParams={paginationParams}
        label={t("paginationLabel")}
      />
    </PageShell>
  );
}
