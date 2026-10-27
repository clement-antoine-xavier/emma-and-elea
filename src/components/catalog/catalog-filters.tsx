"use client";

import {useState} from "react";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {HStack} from "@astryxdesign/core/HStack";
import {Selector} from "@astryxdesign/core/Selector";
import {Stack} from "@astryxdesign/core/Stack";
import {Switch} from "@astryxdesign/core/Switch";
import {TextInput} from "@astryxdesign/core/TextInput";
import {useTranslations} from "next-intl";
import {usePathname, useRouter} from "next/navigation";
import type {CategoryRecord, ItemTypeName} from "@/lib/dto";
import {ITEM_TYPES} from "@/server/validators/catalog.schema";

export function CatalogFilters({
  initialSearch,
  initialType,
  initialCategoryId,
  initialIncludeArchived,
  categories,
}: {
  initialSearch: string;
  initialType: ItemTypeName | null;
  initialCategoryId: string | null;
  initialIncludeArchived: boolean;
  categories: CategoryRecord[];
}) {
  const t = useTranslations("Catalog.filters");
  const tTypes = useTranslations("Catalog.types");
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(initialSearch);
  const [type, setType] = useState(initialType ?? "");
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "");
  const [includeArchived, setIncludeArchived] = useState(initialIncludeArchived);

  function submit() {
    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (type) params.set("type", type);
    if (categoryId) params.set("categoryId", categoryId);
    if (includeArchived) params.set("includeArchived", "true");

    router.push(params.size > 0 ? `${pathname}?${params}` : pathname);
  }

  return (
    <Card padding={4}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Stack gap={4}>
          <TextInput
            label={t("search")}
            value={search}
            onChange={setSearch}
            placeholder={t("searchPlaceholder")}
          />
          <HStack gap={4} wrap="wrap" align="end">
            <Selector
              label={t("type")}
              value={type}
              onChange={setType}
              options={[
                {value: "", label: t("allTypes")},
                ...ITEM_TYPES.map((itemType) => ({
                  value: itemType,
                  label: tTypes(itemType),
                })),
              ]}
            />
            <Selector
              label={t("category")}
              value={categoryId}
              onChange={setCategoryId}
              options={[
                {value: "", label: t("allCategories")},
                ...categories
                  .filter((category) => !category.isArchived)
                  .map((category) => ({
                    value: category.id,
                    label: category.parentName
                      ? `${category.parentName} · ${category.name}`
                      : category.name,
                  })),
              ]}
            />
            <Switch
              label={t("archived")}
              value={includeArchived}
              onChange={setIncludeArchived}
            />
            <Button
              type="submit"
              variant="secondary"
              label={t("apply")}
            />
          </HStack>
        </Stack>
      </form>
    </Card>
  );
}
