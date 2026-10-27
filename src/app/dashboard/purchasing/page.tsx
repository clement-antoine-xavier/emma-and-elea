import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {ListPagination} from "@/components/list-pagination";
import {ReceiptFilters} from "@/components/purchasing/receipt-filters";
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
  const t = await getTranslations("Purchasing");
  const params = await searchParams;
  const view = await purchasingService.getReceipts(actor, params);

  const paginationParams: Record<string, string> = {};
  if (view.filters.search) paginationParams.search = view.filters.search;
  if (view.filters.status) paginationParams.status = view.filters.status;

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
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
          />

          <ReceiptFilters
            initialSearch={view.filters.search}
            initialStatus={view.filters.status}
          />

          {view.page.items.length === 0 ? (
            <Card padding={4}>
              <EmptyState
                title={t("emptyTitle")}
                description={t("emptyBody")}
              />
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
        </Stack>
      </Center>
    </Section>
  );
}
