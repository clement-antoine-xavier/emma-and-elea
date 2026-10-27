"use client";

import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {formatMoney} from "@/lib/format";
import type {ItemListRecord} from "@/lib/dto";

/**
 * Astryx tables take `columns` with render functions, so the table must be a
 * Client Component; the page passes plain data only.
 */
export function ItemTable({
  items,
  currency,
}: {
  items: ItemListRecord[];
  currency: string;
}) {
  const t = useTranslations("Catalog");
  const tTypes = useTranslations("Catalog.types");
  const locale = useLocale();

  return (
    <Table<ItemListRecord>
      data={items}
      idKey="id"
      density="compact"
      columns={[
        {
          key: "code",
          header: t("columns.code"),
          width: pixel(150),
          renderCell: (item) => item.code,
        },
        {
          key: "name",
          header: t("columns.name"),
          width: proportional(3),
          renderCell: (item) => (
            <Stack gap={0}>
              <Text weight="semibold">{item.name}</Text>
              <Text type="supporting" color="secondary">
                {tTypes(item.type)}
              </Text>
            </Stack>
          ),
        },
        {
          key: "category",
          header: t("columns.category"),
          width: proportional(2),
          renderCell: (item) => item.categoryName ?? "—",
        },
        {
          key: "stockUnit",
          header: t("columns.stockUnit"),
          width: pixel(100),
          renderCell: (item) => item.stockUnitCode,
        },
        {
          key: "salePrice",
          header: t("columns.salePrice"),
          width: pixel(120),
          align: "end",
          renderCell: (item) =>
            item.salePrice
              ? formatMoney(item.salePrice, {locale, currency})
              : "—",
        },
        {
          key: "status",
          header: t("columns.status"),
          width: pixel(110),
          renderCell: (item) => (
            <Badge
              label={item.isArchived ? t("archived") : t("active")}
              variant={item.isArchived ? "neutral" : "success"}
            />
          ),
        },
        {
          key: "actions",
          header: "",
          width: pixel(130),
          renderCell: (item) => (
            <Button
              label={t("open")}
              variant="ghost"
              size="sm"
              href={`/dashboard/catalog/items/${item.id}`}
            />
          ),
        },
      ]}
    />
  );
}
