import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
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
    <PageShell
      title={tCategories("title")}
      intro={tCategories("intro")}
      contentWidth={960}
      actions={
        <Button
          label={t("backToCatalog")}
          variant="secondary"
          href="/dashboard/catalog"
        />
      }
    >
      <CategoryManager categories={categories} canWrite={canWrite} />
    </PageShell>
  );
}
