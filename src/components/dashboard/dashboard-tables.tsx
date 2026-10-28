"use client";

import {Badge} from "@astryxdesign/core/Badge";
import {Card} from "@astryxdesign/core/Card";
import {Grid} from "@astryxdesign/core/Grid";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, proportional} from "@astryxdesign/core/Table";
import type {TableColumn} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import type {ReactNode} from "react";
import {useLocale, useTranslations} from "next-intl";
import {formatMoney, formatQuantity} from "@/lib/format";
import type {
  OrderSummaryRecord,
  ProductionBatchSummaryRecord,
  StockLevelRecord,
} from "@/lib/dto";

const ORDER_BADGE: Record<
  string,
  "neutral" | "info" | "success" | "warning" | "error"
> = {
  DRAFT: "neutral",
  CONFIRMED: "info",
  READY: "success",
  DISPATCHED: "success",
  CANCELLED: "error",
};

const BATCH_BADGE: Record<
  string,
  "neutral" | "info" | "success" | "warning" | "error"
> = {
  PLANNED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "error",
};

function TableCard({
  title,
  intro,
  empty,
  isEmpty,
  children,
}: {
  title: string;
  intro: string;
  empty: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <Card padding={5} height="100%">
      <Stack gap={4}>
        <Stack gap={1}>
          <Heading level={3}>{title}</Heading>
          <Text type="supporting" color="secondary">
            {intro}
          </Text>
        </Stack>
        {isEmpty ? (
          <Text type="supporting" color="secondary">
            {empty}
          </Text>
        ) : (
          children
        )}
      </Stack>
    </Card>
  );
}

export function AlertsTable({alerts}: {alerts: StockLevelRecord[]}) {
  const t = useTranslations("Dashboard.home.tables");
  const locale = useLocale();
  const rows = alerts.slice(0, 6).map((row) => ({
    ...row,
    id: `${row.itemId}-${row.siteId}`,
  }));

  const columns: TableColumn<StockLevelRecord>[] = [
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
      key: "onHand",
      header: t("columns.onHand"),
      width: proportional(2),
      renderCell: (row) => (
        <Text>
          {formatQuantity(row.quantity, {locale})} {row.unitCode}
        </Text>
      ),
    },
    {
      key: "minimum",
      header: t("columns.minimum"),
      width: proportional(2),
      renderCell: (row) => (
        <Text>
          {formatQuantity(row.minStockQuantity, {locale})} {row.unitCode}
        </Text>
      ),
    },
    {
      key: "status",
      header: t("columns.status"),
      width: proportional(2),
      renderCell: () => (
        <Badge variant="error" label={t("belowMinimum")} />
      ),
    },
  ];

  return (
    <TableCard
      title={t("alertsTitle")}
      intro={t("alertsIntro")}
      empty={t("alertsEmpty")}
      isEmpty={rows.length === 0}
    >
      <Table
        data={rows}
        columns={columns}
        idKey="id"
        density="compact"
        dividers="rows"
        hasHover
      />
    </TableCard>
  );
}

export function OrdersTable({
  orders,
  currency,
}: {
  orders: OrderSummaryRecord[];
  currency: string;
}) {
  const t = useTranslations("Dashboard.home.tables");
  const tStatus = useTranslations("Dashboard.home.statuses");
  const locale = useLocale();

  const columns: TableColumn<OrderSummaryRecord>[] = [
    {
      key: "number",
      header: t("columns.order"),
      width: proportional(2),
      renderCell: (row) => <Text weight="semibold">{row.number}</Text>,
    },
    {
      key: "customer",
      header: t("columns.customer"),
      width: proportional(3),
      renderCell: (row) => row.customerName,
    },
    {
      key: "status",
      header: t("columns.status"),
      width: proportional(2),
      renderCell: (row) => (
        <Badge variant={ORDER_BADGE[row.status] ?? "neutral"} label={tStatus(row.status)} />
      ),
    },
    {
      key: "total",
      header: t("columns.total"),
      width: proportional(2),
      renderCell: (row) => formatMoney(row.totalAmount, {locale, currency}),
    },
  ];

  return (
    <TableCard
      title={t("ordersTitle")}
      intro={t("ordersIntro")}
      empty={t("ordersEmpty")}
      isEmpty={orders.length === 0}
    >
      <Table
        data={orders}
        columns={columns}
        idKey="id"
        density="compact"
        dividers="rows"
        hasHover
      />
    </TableCard>
  );
}

export function UpcomingBatchesTable({
  batches,
}: {
  batches: ProductionBatchSummaryRecord[];
}) {
  const t = useTranslations("Dashboard.home.tables");
  const tStatus = useTranslations("Dashboard.home.statuses");
  const locale = useLocale();

  const columns: TableColumn<ProductionBatchSummaryRecord>[] = [
    {
      key: "code",
      header: t("columns.batch"),
      width: proportional(2),
      renderCell: (row) => <Text weight="semibold">{row.code}</Text>,
    },
    {
      key: "recipe",
      header: t("columns.recipe"),
      width: proportional(3),
      renderCell: (row) => row.recipeName,
    },
    {
      key: "quantity",
      header: t("columns.quantity"),
      width: proportional(2),
      renderCell: (row) =>
        `${formatQuantity(row.plannedQuantity, {locale})} ${row.unitCode}`,
    },
    {
      key: "status",
      header: t("columns.status"),
      width: proportional(2),
      renderCell: (row) => (
        <Badge variant={BATCH_BADGE[row.status] ?? "neutral"} label={tStatus(row.status)} />
      ),
    },
  ];

  return (
    <TableCard
      title={t("batchesTitle")}
      intro={t("batchesIntro")}
      empty={t("batchesEmpty")}
      isEmpty={batches.length === 0}
    >
      <Table
        data={batches}
        columns={columns}
        idKey="id"
        density="compact"
        dividers="rows"
        hasHover
      />
    </TableCard>
  );
}

export function DashboardTables({
  alerts,
  orders,
  batches,
  currency,
  can,
}: {
  alerts: StockLevelRecord[];
  orders: OrderSummaryRecord[];
  batches: ProductionBatchSummaryRecord[];
  currency: string;
  can: {stock: boolean; orders: boolean; production: boolean};
}) {
  return (
    <Stack gap={4}>
      <Grid columns={{minWidth: 340, max: 3}} gap={4}>
        {can.stock ? <AlertsTable alerts={alerts} /> : null}
        {can.orders ? <OrdersTable orders={orders} currency={currency} /> : null}
        {can.production ? <UpcomingBatchesTable batches={batches} /> : null}
      </Grid>
      {!can.stock && !can.orders && !can.production ? (
        <Text type="supporting" color="secondary">
          —
        </Text>
      ) : null}
    </Stack>
  );
}
