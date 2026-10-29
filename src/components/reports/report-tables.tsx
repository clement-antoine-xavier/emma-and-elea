"use client";

import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Stack} from "@astryxdesign/core/Stack";
import {Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {
  formatBusinessDate,
  formatMoney,
  formatPercent,
  formatQuantity,
} from "@/lib/format";
import type {
  BatchYieldRecord,
  CategoryProfitabilityRecord,
  ProductMarginRecord,
  ProductProfitabilityRecord,
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
        {
          key: "computedAt",
          header: t("columns.computedAt"),
          width: pixel(130),
          align: "end",
          renderCell: (row) =>
            row.computedAt
              ? formatBusinessDate(row.computedAt, {locale})
              : "—",
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

export function ProductProfitabilityTable({
  records,
}: {
  records: ProductProfitabilityRecord[];
}) {
  const t = useTranslations("Reports.profitability");
  const locale = useLocale();

  return (
    <Table<ProductProfitabilityRecord>
      data={records}
      idKey="itemId"
      density="compact"
      columns={[
        {
          key: "product",
          header: t("columns.product"),
          width: proportional(3),
          renderCell: (row) => (
            <Stack gap={0}>
              <Text weight="semibold">{row.itemName}</Text>
              <Text type="supporting" color="secondary">
                {row.itemCode}
                {row.categoryName ? ` · ${row.categoryName}` : ""}
                {row.missingRevenue ? ` · ${t("missingRevenue")}` : ""}
              </Text>
            </Stack>
          ),
        },
        {
          key: "produced",
          header: t("columns.produced"),
          width: pixel(100),
          align: "end",
          renderCell: (row) => formatQuantity(row.produced, {locale}),
        },
        {
          key: "sold",
          header: t("columns.sold"),
          width: pixel(100),
          align: "end",
          renderCell: (row) => formatQuantity(row.sold, {locale}),
        },
        {
          key: "unsold",
          header: t("columns.unsold"),
          width: pixel(100),
          align: "end",
          renderCell: (row) => formatQuantity(row.unsold, {locale}),
        },
        {
          key: "waste",
          header: t("columns.waste"),
          width: pixel(100),
          align: "end",
          renderCell: (row) => formatQuantity(row.waste, {locale}),
        },
        {
          key: "revenue",
          header: t("columns.revenue"),
          width: pixel(120),
          align: "end",
          renderCell: (row) =>
            formatMoney(row.revenue, {locale, currency: row.currency}),
        },
        {
          key: "contribution",
          header: t("columns.contribution"),
          width: pixel(130),
          align: "end",
          renderCell: (row) =>
            row.contribution
              ? formatMoney(row.contribution, {
                  locale,
                  currency: row.currency,
                })
              : "—",
        },
        {
          key: "margin",
          header: t("columns.margin"),
          width: pixel(100),
          align: "end",
          renderCell: (row) =>
            row.marginPct ? formatPercent(row.marginPct, {locale}) : "—",
        },
        {
          key: "loss",
          header: t("columns.loss"),
          width: pixel(100),
          align: "end",
          renderCell: (row) =>
            row.lossRatePct ? formatPercent(row.lossRatePct, {locale}) : "—",
        },
        {
          key: "unsoldRate",
          header: t("columns.unsoldRate"),
          width: pixel(110),
          align: "end",
          renderCell: (row) =>
            row.unsoldRatePct
              ? formatPercent(row.unsoldRatePct, {locale})
              : "—",
        },
      ]}
    />
  );
}

export function CategoryProfitabilityTable({
  records,
  currency,
}: {
  records: CategoryProfitabilityRecord[];
  currency: string;
}) {
  const t = useTranslations("Reports.categories");
  const locale = useLocale();

  return (
    <Table<CategoryProfitabilityRecord>
      data={records}
      idKey="categoryName"
      density="compact"
      columns={[
        {
          key: "category",
          header: t("columns.category"),
          width: proportional(3),
          renderCell: (row) => `${row.categoryName} (${row.productCount})`,
        },
        {
          key: "sold",
          header: t("columns.sold"),
          width: pixel(110),
          align: "end",
          renderCell: (row) => formatQuantity(row.sold, {locale}),
        },
        {
          key: "unsold",
          header: t("columns.unsold"),
          width: pixel(110),
          align: "end",
          renderCell: (row) => formatQuantity(row.unsold, {locale}),
        },
        {
          key: "revenue",
          header: t("columns.revenue"),
          width: pixel(130),
          align: "end",
          renderCell: (row) =>
            formatMoney(row.revenue, {locale, currency}),
        },
        {
          key: "contribution",
          header: t("columns.contribution"),
          width: pixel(140),
          align: "end",
          renderCell: (row) =>
            row.contribution
              ? formatMoney(row.contribution, {locale, currency})
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
        {
          key: "loss",
          header: t("columns.loss"),
          width: pixel(110),
          align: "end",
          renderCell: (row) =>
            row.lossRatePct ? formatPercent(row.lossRatePct, {locale}) : "—",
        },
      ]}
    />
  );
}
