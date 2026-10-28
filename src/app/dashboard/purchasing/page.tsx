import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {ListToolbar} from "@/components/list/list-toolbar";
import {ListPagination} from "@/components/list-pagination";
import {ReceiptTable} from "@/components/purchasing/receipt-table";
import {requirePermission} from "@/server/auth/actor";
import {purchasingService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Purchasing");

  return {title: t("metadataTitle")};
}

type PurchasingSearchParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PurchasingPage({
  searchParams,
}: PurchasingSearchParams) {
  const actor = await requirePermission("purchasing:read");
  const [t, tFilters, tStatus, params] = await Promise.all([
    getTranslations("Purchasing"),
    getTranslations("Purchasing.filters"),
    getTranslations("Purchasing.statuses"),
    searchParams,
  ]);
  const view = await purchasingService.getReceipts(actor, params);

  const paginationParams: Record<string, string> = {};
  if (view.filters.search) paginationParams.search = view.filters.search;
  if (view.filters.status) paginationParams.status = view.filters.status;

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      actions={
        <HStack gap={2} wrap="wrap">
          <Button
            label={t("suppliersLink")}
            variant="secondary"
            href="/dashboard/purchasing/suppliers"
          />
          {view.canWrite ? (
            <Button
              label={t("newReceipt")}
              variant="primary"
              href="/dashboard/purchasing/receipts/new"
            />
          ) : null}
        </HStack>
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
          label: tFilters("status"),
          value: view.filters.status ?? "",
          options: [
            {value: "", label: tFilters("allView")},
            {value: "DRAFT", label: tStatus("DRAFT")},
            {value: "POSTED", label: tStatus("POSTED")},
            {value: "CANCELLED", label: tStatus("CANCELLED")},
          ],
        }}
        summary={t("count", {count: view.page.total})}
      />

      {view.page.items.length === 0 ? (
        <Card padding={4}>
          <EmptyState title={t("emptyTitle")} description={t("emptyBody")} />
        </Card>
      ) : (
        <Stack gap={4}>
          <ReceiptTable receipts={view.page.items} />
          <ListPagination
            page={view.page.page}
            pageSize={view.page.pageSize}
            total={view.page.total}
            searchParams={paginationParams}
            label={t("paginationLabel")}
          />
        </Stack>
      )}
    </PageShell>
  );
}
