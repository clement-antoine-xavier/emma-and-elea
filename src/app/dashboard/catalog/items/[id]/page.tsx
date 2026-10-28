import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {PropertyList} from "@/components/layout/property-list";
import {AllergenManager} from "@/components/catalog/allergen-manager";
import {ArchiveItemButton} from "@/components/catalog/archive-item-button";
import {ItemForm} from "@/components/catalog/item-form";
import {formatMoney} from "@/lib/format";
import {can} from "@/lib/permissions";
import {requirePermission} from "@/server/auth/actor";
import {catalogService, settingsService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type ItemParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: ItemParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("catalog:read");
  const item = await catalogService.getItem(actor, id);
  const t = await getTranslations("Catalog");

  return {title: item ? `${item.name} · ${t("title")}` : t("metadataTitle")};
}

export default async function ItemDetailPage({params}: ItemParams) {
  const {id} = await params;
  const actor = await requirePermission("catalog:read");
  const item = await catalogService.getItem(actor, id);

  if (!item) notFound();

  const [{units, categories, allergens}, settingsView, locale] =
    await Promise.all([
      catalogService.getItemFormOptions(actor),
      settingsService.getSettings(actor),
      getLocale(),
    ]);
  const t = await getTranslations("Catalog");
  const tItem = await getTranslations("Catalog.item");
  const tDetail = await getTranslations("Catalog.detail");
  const tTypes = await getTranslations("Catalog.types");
  const tChannels = await getTranslations("Catalog.channels");
  const canWrite = can(actor.role, "catalog:write");

  const salePrice = item.salePrice
    ? formatMoney(item.salePrice, {
        locale,
        currency: settingsView.settings.currency,
      })
    : tDetail("none");

  const facts = [
    {label: tItem("fields.code"), value: item.code},
    {label: tItem("fields.type"), value: tTypes(item.type)},
    {
      label: tItem("fields.category"),
      value: item.categoryName ?? tItem("fields.noCategory"),
    },
    {label: tItem("fields.stockUnit"), value: item.stockUnitCode},
    {
      label: tItem("fields.saleUnit"),
      value: item.saleUnitCode ?? tItem("fields.noSaleUnit"),
    },
    {label: tItem("fields.salePrice"), value: salePrice},
    {label: tItem("fields.vatRate"), value: `${item.vatRate} %`},
    {
      label: tItem("fields.defaultChannel"),
      value: tChannels(item.defaultChannel),
    },
  ];

  return (
    <PageShell
      title={item.name}
      intro={`${item.code} · ${tTypes(item.type)}`}
      actions={
        <Button
          label={t("backToCatalog")}
          variant="secondary"
          href="/dashboard/catalog"
        />
      }
      contentWidth={1200}
    >
      {item.isArchived ? (
        <Banner
          status="warning"
          title={tDetail("archivedTitle")}
          description={tDetail("archivedBody")}
        />
      ) : null}

      <DetailShell
        asideLabel={t("columns.status")}
        aside={
          <Stack gap={4}>
            <Card padding={5}>
              <PropertyList
                columns="single"
                labelPosition="start"
                items={[
                  {
                    label: t("columns.status"),
                    value: (
                      <Badge
                        label={item.isArchived ? t("archived") : t("active")}
                        variant={item.isArchived ? "neutral" : "success"}
                      />
                    ),
                  },
                  {label: tItem("fields.type"), value: tTypes(item.type)},
                  {
                    label: tItem("fields.category"),
                    value: item.categoryName ?? tItem("fields.noCategory"),
                  },
                  {
                    label: tItem("fields.stockUnit"),
                    value: item.stockUnitCode,
                  },
                  {
                    label: tItem("fields.defaultChannel"),
                    value: tChannels(item.defaultChannel),
                  },
                ]}
              />
            </Card>
            {canWrite && !item.isArchived ? (
              <Card padding={5}>
                <ArchiveItemButton
                  itemId={item.id}
                  itemName={item.name}
                />
              </Card>
            ) : null}
          </Stack>
        }
      >
        <Stack gap={6}>
          {canWrite ? (
            <ItemForm
              mode="edit"
              item={item}
              units={units}
              categories={categories}
            />
          ) : (
            <Card padding={5}>
              <Stack gap={4}>
                <Heading level={2}>{tItem("editTitle")}</Heading>
                <PropertyList items={facts} />
              </Stack>
            </Card>
          )}

          <AllergenManager
            itemId={item.id}
            allergens={item.allergens}
            options={allergens}
            canWrite={canWrite}
          />

          <Stack gap={3}>
            <Heading level={2}>{tDetail("whereUsedTitle")}</Heading>
            <Card padding={5}>
              <PropertyList
                items={[
                  {
                    label: tDetail("usedIn"),
                    value:
                      item.usedInRecipes.length > 0
                        ? item.usedInRecipes
                            .map((recipe) => recipe.name)
                            .join(", ")
                        : tDetail("none"),
                  },
                  {
                    label: tDetail("produces"),
                    value:
                      item.producesRecipes.length > 0
                        ? item.producesRecipes
                            .map((recipe) => recipe.name)
                            .join(", ")
                        : tDetail("none"),
                  },
                  {
                    label: tDetail("suppliers"),
                    value: tDetail("supplierCount", {
                      count: item.supplierCount,
                    }),
                  },
                ]}
              />
            </Card>
          </Stack>
        </Stack>
      </DetailShell>
    </PageShell>
  );
}
