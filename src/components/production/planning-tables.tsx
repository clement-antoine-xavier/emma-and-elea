"use client";

import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {formatBusinessDate, formatQuantity} from "@/lib/format";
import type {
  ForecastSuggestionRecord,
  OrderDemandRecord,
  ProductionPlanSummaryRecord,
} from "@/lib/dto";

export function ForecastTable({
  suggestions,
}: {
  suggestions: ForecastSuggestionRecord[];
}) {
  const t = useTranslations("Production.planning.forecast");
  const tBasis = useTranslations("Production.planning.basis");
  const locale = useLocale();

  return (
    <Table<ForecastSuggestionRecord>
      data={suggestions}
      idKey="itemId"
      density="compact"
      columns={[
        {
          key: "item",
          header: t("columns.item"),
          width: proportional(3),
          renderCell: (row) => (
            <Stack gap={0}>
              <Text weight="semibold">{row.itemName}</Text>
              <Text type="supporting" color="secondary">
                {row.itemCode}
              </Text>
            </Stack>
          ),
        },
        {
          key: "recipe",
          header: t("columns.recipe"),
          width: proportional(2),
          renderCell: (row) => row.recipeName,
        },
        {
          key: "history",
          header: t("columns.history"),
          width: pixel(110),
          align: "end",
          renderCell: (row) =>
            `${formatQuantity(row.historyQuantity, {locale})} ${row.unitCode}`,
        },
        {
          key: "average",
          header: t("columns.average"),
          width: pixel(120),
          align: "end",
          renderCell: (row) =>
            `${formatQuantity(row.averageQuantity, {locale})} ${row.unitCode}`,
        },
        {
          key: "stock",
          header: t("columns.stock"),
          width: pixel(110),
          align: "end",
          renderCell: (row) =>
            `${formatQuantity(row.stockQuantity, {locale})} ${row.unitCode}`,
        },
        {
          key: "suggested",
          header: t("columns.suggested"),
          width: pixel(130),
          align: "end",
          renderCell: (row) => (
            <Stack gap={0} align="end">
              <Text weight="semibold">
                {`${formatQuantity(row.suggestedQuantity, {locale})} ${row.unitCode}`}
              </Text>
              <Text type="supporting" color="secondary">
                {tBasis(row.basis)}
              </Text>
            </Stack>
          ),
        },
      ]}
    />
  );
}

export function OrderDemandTable({orders}: {orders: OrderDemandRecord[]}) {
  const t = useTranslations("Production.planning.orders");
  const locale = useLocale();

  return (
    <Table<OrderDemandRecord>
      data={orders}
      idKey="orderLineId"
      density="compact"
      columns={[
        {
          key: "order",
          header: t("columns.order"),
          width: pixel(150),
          renderCell: (row) => row.orderNumber,
        },
        {
          key: "customer",
          header: t("columns.customer"),
          width: proportional(3),
          renderCell: (row) => row.customerName,
        },
        {
          key: "item",
          header: t("columns.item"),
          width: proportional(3),
          renderCell: (row) => (
            <Stack gap={0}>
              <Text weight="semibold">{row.itemName}</Text>
              <Text type="supporting" color="secondary">
                {row.itemCode}
              </Text>
            </Stack>
          ),
        },
        {
          key: "quantity",
          header: t("columns.quantity"),
          width: pixel(120),
          align: "end",
          renderCell: (row) =>
            `${formatQuantity(row.quantity, {locale})} ${row.unitCode}`,
        },
        {
          key: "recipe",
          header: t("columns.recipe"),
          width: proportional(2),
          renderCell: (row) => row.recipeName ?? t("noRecipe"),
        },
      ]}
    />
  );
}

export function PlanTable({plans}: {plans: ProductionPlanSummaryRecord[]}) {
  const t = useTranslations("Production.planning.plans");
  const tStatuses = useTranslations("Production.planning.statuses");
  const tSources = useTranslations("Production.planning.sources");
  const locale = useLocale();

  return (
    <Table<ProductionPlanSummaryRecord>
      data={plans}
      idKey="id"
      density="compact"
      columns={[
        {
          key: "date",
          header: t("columns.date"),
          width: pixel(140),
          renderCell: (plan) => formatBusinessDate(plan.plannedFor, {locale}),
        },
        {
          key: "status",
          header: t("columns.status"),
          width: pixel(130),
          renderCell: (plan) => (
            <Badge
              label={tStatuses(plan.status)}
              variant={
                plan.status === "CONFIRMED"
                  ? "success"
                  : plan.status === "CANCELLED"
                    ? "neutral"
                    : plan.status === "CLOSED"
                      ? "neutral"
                      : "warning"
              }
            />
          ),
        },
        {
          key: "source",
          header: t("columns.source"),
          width: pixel(130),
          renderCell: (plan) => tSources(plan.source),
        },
        {
          key: "lines",
          header: t("columns.lines"),
          width: pixel(90),
          align: "end",
          renderCell: (plan) => String(plan.lineCount),
        },
        {
          key: "actions",
          header: "",
          width: pixel(100),
          renderCell: (plan) => (
            <Button
              label={t("open")}
              variant="ghost"
              size="sm"
              href={`/dashboard/production/planning/${plan.id}`}
            />
          ),
        },
      ]}
    />
  );
}
