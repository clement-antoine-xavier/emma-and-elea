import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {CategoryManager} from "@/components/catalog/category-manager";
import {requirePermission} from "@/server/auth/actor";
import {catalogService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Catalog.categories");

  return {title: t("metadataTitle")};
}

export default async function CategoriesPage() {
  const actor = await requirePermission("catalog:read");
  const t = await getTranslations("Catalog");
  const tCategories = await getTranslations("Catalog.categories");
  const {categories, canWrite} = await catalogService.getCategoriesView(actor);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={960} width="100%">
          <PageHeader
            title={tCategories("title")}
            intro={tCategories("intro")}
            actions={
              <Button
                label={t("backToCatalog")}
                variant="secondary"
                href="/dashboard/catalog"
              />
            }
          />
          <CategoryManager categories={categories} canWrite={canWrite} />
        </Stack>
      </Center>
    </Section>
  );
}
