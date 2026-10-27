import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
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
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={760} width="100%">
          <PageHeader
            title={t("newItem")}
            actions={
              <Button
                label={t("backToCatalog")}
                variant="secondary"
                href="/dashboard/catalog"
              />
            }
          />
          <ItemForm mode="create" units={units} categories={categories} />
        </Stack>
      </Center>
    </Section>
  );
}
