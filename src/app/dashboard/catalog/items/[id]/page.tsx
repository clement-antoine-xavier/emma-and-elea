import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
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

function Definition({label, value}: {label: string; value: string}) {
  return (
    <Stack gap={1}>
      <Text type="label" color="secondary">
        {label}
      </Text>
      <Text>{value}</Text>
    </Stack>
  );
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

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={960} width="100%">
          <PageHeader
            title={item.name}
            intro={`${item.code} · ${tTypes(item.type)}`}
            actions={
              <HStack gap={2} wrap="wrap">
                <Badge
                  label={item.isArchived ? t("archived") : t("active")}
                  variant={item.isArchived ? "neutral" : "success"}
                />
                <Button
                  label={t("backToCatalog")}
                  variant="secondary"
                  href="/dashboard/catalog"
                />
                {canWrite && !item.isArchived ? (
                  <ArchiveItemButton itemId={item.id} itemName={item.name} />
                ) : null}
              </HStack>
            }
          />

          {item.isArchived ? (
            <Banner
              status="warning"
              title={tDetail("archivedTitle")}
              description={tDetail("archivedBody")}
            />
          ) : null}

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
                <Grid columns={{minWidth: 180, max: 3}} gap={4}>
                  <Definition
                    label={tItem("fields.code")}
                    value={item.code}
                  />
                  <Definition
                    label={tItem("fields.type")}
                    value={tTypes(item.type)}
                  />
                  <Definition
                    label={tItem("fields.category")}
                    value={item.categoryName ?? tItem("fields.noCategory")}
                  />
                  <Definition
                    label={tItem("fields.stockUnit")}
                    value={item.stockUnitCode}
                  />
                  <Definition
                    label={tItem("fields.saleUnit")}
                    value={item.saleUnitCode ?? tItem("fields.noSaleUnit")}
                  />
                  <Definition
                    label={tItem("fields.salePrice")}
                    value={salePrice}
                  />
                  <Definition
                    label={tItem("fields.vatRate")}
                    value={`${item.vatRate} %`}
                  />
                  <Definition
                    label={tItem("fields.defaultChannel")}
                    value={tChannels(item.defaultChannel)}
                  />
                </Grid>
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
              <Grid columns={{minWidth: 200, max: 3}} gap={4}>
                <Definition
                  label={tDetail("usedIn")}
                  value={
                    item.usedInRecipes.length > 0
                      ? item.usedInRecipes.map((recipe) => recipe.name).join(", ")
                      : tDetail("none")
                  }
                />
                <Definition
                  label={tDetail("produces")}
                  value={
                    item.producesRecipes.length > 0
                      ? item.producesRecipes
                          .map((recipe) => recipe.name)
                          .join(", ")
                      : tDetail("none")
                  }
                />
                <Definition
                  label={tDetail("suppliers")}
                  value={tDetail("supplierCount", {count: item.supplierCount})}
                />
              </Grid>
            </Card>
          </Stack>
        </Stack>
      </Center>
    </Section>
  );
}
