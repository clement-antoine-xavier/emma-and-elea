"use client";

import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {formatBusinessDate, formatMoney} from "@/lib/format";
import type {ReceiptSummaryRecord} from "@/lib/dto";

export function ReceiptTable({receipts}: {receipts: ReceiptSummaryRecord[]}) {
  const t = useTranslations("Purchasing");
  const tStatuses = useTranslations("Purchasing.statuses");
  const locale = useLocale();

  return (
    <Table<ReceiptSummaryRecord>
      data={receipts}
      idKey="id"
      density="compact"
      columns={[
        {
          key: "number",
          header: t("columns.number"),
          width: pixel(150),
          renderCell: (receipt) => receipt.number,
        },
        {
          key: "supplier",
          header: t("columns.supplier"),
          width: proportional(3),
          renderCell: (receipt) => (
            <Stack gap={0}>
              <Text>{receipt.supplierName}</Text>
              <Text type="supporting" color="secondary">
                {receipt.siteName}
              </Text>
            </Stack>
          ),
        },
        {
          key: "status",
          header: t("columns.status"),
          width: pixel(120),
          renderCell: (receipt) => (
            <Badge
              label={tStatuses(receipt.status)}
              variant={
                receipt.status === "POSTED"
                  ? "success"
                  : receipt.status === "CANCELLED"
                    ? "neutral"
                    : "warning"
              }
            />
          ),
        },
        {
          key: "receivedAt",
          header: t("columns.receivedAt"),
          width: pixel(140),
          renderCell: (receipt) =>
            receipt.receivedAt
              ? formatBusinessDate(receipt.receivedAt, {locale})
              : "—",
        },
        {
          key: "total",
          header: t("columns.total"),
          width: pixel(120),
          align: "end",
          renderCell: (receipt) =>
            formatMoney(receipt.totalAmount, {
              locale,
              currency: receipt.currency,
            }),
        },
        {
          key: "actions",
          header: "",
          width: pixel(110),
          renderCell: (receipt) => (
            <Button
              label={t("open")}
              variant="ghost"
              size="sm"
              href={`/dashboard/purchasing/receipts/${receipt.id}`}
            />
          ),
        },
      ]}
    />
  );
}
