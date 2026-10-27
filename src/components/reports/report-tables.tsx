"use client";

import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Stack} from "@astryxdesign/core/Stack";
import {Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {formatBusinessDate, formatMoney, formatPercent} from "@/lib/format";
import type {
  BatchYieldRecord,
  ProductMarginRecord,
} from "@/lib/dto";

export function ProductMarginsTable({
  margins,
}: {
  margins: ProductMarginRecord[];
}) {
  const t = useTranslations("Reports.margins");
  const locale = useLocale();

  return (
    <Table<ProductMarginRecord>
      data={margins}
      idKey="recipeId"
      density="compact"
      columns={[
        {
          key: "product",
          header: t("columns.product"),
          width: proportional(3),
          renderCell: (row) => (
            <Stack gap={0}>
              <Text weight="semibold">{row.outputItemName}</Text>
              <Text type="supporting" color="secondary">
                {row.recipeName}
                {row.categoryName ? ` · ${row.categoryName}` : ""}
              </Text>
            </Stack>
          ),
        },
        {
          key: "cost",
          header: t("columns.cost"),
          width: pixel(130),
          align: "end",
          renderCell: (row) =>
            formatMoney(row.costPerUnit, {
              locale,
              currency: row.currency,
            }),
        },
        {
          key: "price",
          header: t("columns.price"),
          width: pixel(130),
          align: "end",
          renderCell: (row) =>
            row.salePrice
              ? formatMoney(row.salePrice, {
                  locale,
                  currency: row.currency,
                })
              : "—",
        },
        {
          key: "margin",
          header: t("columns.margin"),
          width: pixel(110),
          align: "end",
          renderCell: (row) =>
            row.marginPct ? formatPercent(row.marginPct, {locale}) : "—",
        },
      ]}
    />
  );
}

export function BatchYieldsTable({yields}: {yields: BatchYieldRecord[]}) {
  const t = useTranslations("Reports.yields");
  const locale = useLocale();

  return (
    <Table<BatchYieldRecord>
      data={yields}
      idKey="id"
      density="compact"
      columns={[
        {
          key: "batch",
          header: t("columns.batch"),
          width: pixel(150),
          renderCell: (row) => row.code,
        },
        {
          key: "recipe",
          header: t("columns.recipe"),
          width: proportional(3),
          renderCell: (row) => row.recipeName,
        },
        {
          key: "planned",
          header: t("columns.planned"),
          width: pixel(120),
          align: "end",
          renderCell: (row) => `${row.plannedQuantity} ${row.unitCode}`,
        },
        {
          key: "actual",
          header: t("columns.actual"),
          width: pixel(120),
          align: "end",
          renderCell: (row) => `${row.actualQuantity} ${row.unitCode}`,
        },
        {
          key: "yield",
          header: t("columns.yield"),
          width: pixel(110),
          align: "end",
          renderCell: (row) => formatPercent(row.yieldPct, {locale}),
        },
        {
          key: "date",
          header: t("columns.date"),
          width: pixel(140),
          renderCell: (row) =>
            row.producedOn ? formatBusinessDate(row.producedOn, {locale}) : "—",
        },
      ]}
    />
  );
}
