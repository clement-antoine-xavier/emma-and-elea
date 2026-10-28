import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {ListToolbar} from "@/components/list/list-toolbar";
import {ItemTable} from "@/components/catalog/item-table";
import {ListPagination} from "@/components/list-pagination";
import {ITEM_TYPES} from "@/server/validators/catalog.schema";
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
  const [t, tFilters, tTypes, params] = await Promise.all([
    getTranslations("Catalog"),
    getTranslations("Catalog.filters"),
    getTranslations("Catalog.types"),
    searchParams,
  ]);
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
    <PageShell
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
    >
      <ListToolbar
        search={{
          value: view.filters.search,
          label: tFilters("search"),
          placeholder: tFilters("searchPlaceholder"),
        }}
        scope={{
          key: "includeArchived",
          label: tFilters("scope"),
          value: view.filters.includeArchived ? "true" : "",
          options: [
            {value: "", label: tFilters("activeView")},
            {value: "true", label: tFilters("allView")},
          ],
        }}
        filters={[
          {
            key: "type",
            label: tFilters("type"),
            value: view.filters.type ?? "",
            allLabel: tFilters("allTypes"),
            options: ITEM_TYPES.map((itemType) => ({
              value: itemType,
              label: tTypes(itemType),
            })),
          },
          {
            key: "categoryId",
            label: tFilters("category"),
            value: view.filters.categoryId ?? "",
            allLabel: tFilters("allCategories"),
            options: view.categories.map((category) => ({
              value: category.id,
              label: category.name,
            })),
          },
        ]}
        summary={t("count", {count: view.page.total})}
      />

      {view.page.items.length === 0 ? (
        <Card padding={4}>
          <EmptyState title={t("emptyTitle")} description={t("emptyBody")} />
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

    </PageShell>
  );
}
