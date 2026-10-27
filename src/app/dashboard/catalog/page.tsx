import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Text} from "@astryxdesign/core/Text";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {CatalogFilters} from "@/components/catalog/catalog-filters";
import {ItemTable} from "@/components/catalog/item-table";
import {ListPagination} from "@/components/list-pagination";
import {requirePermission} from "@/server/auth/actor";
import {catalogService, settingsService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Catalog");

  return {title: t("metadataTitle")};
}

type CatalogSearchParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({
  searchParams,
}: CatalogSearchParams) {
  const actor = await requirePermission("catalog:read");
  const t = await getTranslations("Catalog");
  const params = await searchParams;
  const [view, settingsView] = await Promise.all([
    catalogService.getCatalogView(actor, params),
    settingsService.getSettings(actor),
  ]);

  const paginationParams: Record<string, string> = {};
  if (view.filters.search) paginationParams.search = view.filters.search;
  if (view.filters.type) paginationParams.type = view.filters.type;
  if (view.filters.categoryId) {
    paginationParams.categoryId = view.filters.categoryId;
  }
  if (view.filters.includeArchived) {
    paginationParams.includeArchived = "true";
  }

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
                  label={t("categoriesLink")}
                  variant="secondary"
                  href="/dashboard/catalog/categories"
                />
                {view.canWrite ? (
                  <Button
                    label={t("newItem")}
                    variant="primary"
                    href="/dashboard/catalog/items/new"
                  />
                ) : null}
              </HStack>
            }
          />

          <CatalogFilters
            initialSearch={view.filters.search}
            initialType={view.filters.type}
            initialCategoryId={view.filters.categoryId}
            initialIncludeArchived={view.filters.includeArchived}
            categories={view.categories}
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
              <ItemTable
                items={view.page.items}
                currency={settingsView.settings.currency}
              />

              <ListPagination
                page={view.page.page}
                pageSize={view.page.pageSize}
                total={view.page.total}
                searchParams={paginationParams}
                label={t("paginationLabel")}
              />
            </Stack>
          )}

          <Text type="supporting" color="secondary">
            {t("count", {count: view.page.total})}
          </Text>
        </Stack>
      </Center>
    </Section>
  );
}
