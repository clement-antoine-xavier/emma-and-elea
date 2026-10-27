"use client";

import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {formatQuantity} from "@/lib/format";
import type {StockLevelRecord} from "@/lib/dto";

export function StockLevelsTable({levels}: {levels: StockLevelRecord[]}) {
  const t = useTranslations("Stock");
  const locale = useLocale();

  return (
    <Table<StockLevelRecord>
      data={levels}
      idKey={(level) => `${level.siteId}:${level.itemId}`}
      density="compact"
      columns={[
        {
          key: "item",
          header: t("columns.item"),
          width: proportional(3),
          renderCell: (level) => (
            <Stack gap={0}>
              <Text weight="semibold">{level.itemName}</Text>
              <Text type="supporting" color="secondary">
                {level.itemCode}
              </Text>
            </Stack>
          ),
        },
        {
          key: "site",
          header: t("columns.site"),
          width: proportional(2),
          renderCell: (level) => level.siteName,
        },
        {
          key: "quantity",
          header: t("columns.quantity"),
          width: pixel(120),
          align: "end",
          renderCell: (level) =>
            `${formatQuantity(level.quantity, {locale})} ${level.unitCode}`,
        },
        {
          key: "minimum",
          header: t("columns.minimum"),
          width: pixel(120),
          align: "end",
          renderCell: (level) =>
            level.minStockQuantity
              ? `${formatQuantity(level.minStockQuantity, {locale})} ${level.unitCode}`
              : "—",
        },
        {
          key: "status",
          header: t("columns.status"),
          width: pixel(120),
          renderCell: (level) => (
            <Badge
              label={level.isBelowMin ? t("low") : t("ok")}
              variant={level.isBelowMin ? "warning" : "success"}
            />
          ),
        },
        {
          key: "actions",
          header: "",
          width: pixel(100),
          renderCell: (level) => (
            <Button
              label={t("lotsButton")}
              variant="ghost"
              size="sm"
              href={`/dashboard/stock/lots?search=${encodeURIComponent(level.itemCode)}`}
            />
          ),
        },
      ]}
    />
  );
}
