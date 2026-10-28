import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {ItemForm} from "@/components/catalog/item-form";
import {requirePermission} from "@/server/auth/actor";
import {catalogService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Catalog.item");

  return {title: t("createMetadataTitle")};
}

export default async function NewItemPage() {
  const actor = await requirePermission("catalog:write");
  const t = await getTranslations("Catalog");
  const {units, categories} =
    await catalogService.getItemFormOptions(actor);

  return (
    <PageShell
      title={t("newItem")}
      contentWidth={760}
      actions={
        <Button
          label={t("backToCatalog")}
          variant="secondary"
          href="/dashboard/catalog"
        />
      }
    >
      <ItemForm mode="create" units={units} categories={categories} />
    </PageShell>
  );
}
