"use client";

import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {formatBusinessDate, formatQuantity} from "@/lib/format";
import type {LotSummaryRecord} from "@/lib/dto";

export function LotTable({lots}: {lots: LotSummaryRecord[]}) {
  const t = useTranslations("Stock.lots");
  const locale = useLocale();

  return (
    <Table<LotSummaryRecord>
      data={lots}
      idKey="id"
      density="compact"
      columns={[
        {
          key: "lotNumber",
          header: t("columns.lotNumber"),
          width: pixel(160),
          renderCell: (lot) => lot.lotNumber,
        },
        {
          key: "item",
          header: t("columns.item"),
          width: proportional(3),
          renderCell: (lot) => (
            <Stack gap={0}>
              <Text weight="semibold">{lot.itemName}</Text>
              <Text type="supporting" color="secondary">
                {lot.itemCode}
              </Text>
            </Stack>
          ),
        },
        {
          key: "site",
          header: t("columns.site"),
          width: proportional(2),
          renderCell: (lot) => lot.siteName,
        },
        {
          key: "remaining",
          header: t("columns.remaining"),
          width: pixel(120),
          align: "end",
          renderCell: (lot) =>
            `${formatQuantity(lot.quantityRemaining, {locale})} ${lot.unitCode}`,
        },
        {
          key: "expiresOn",
          header: t("columns.expiresOn"),
          width: pixel(140),
          renderCell: (lot) =>
            lot.expiresOn
              ? formatBusinessDate(lot.expiresOn, {locale})
              : "—",
        },
        {
          key: "status",
          header: t("columns.status"),
          width: pixel(130),
          renderCell: (lot) => (
            <Badge
              label={t(`statuses.${lot.status}`)}
              variant={lot.status === "AVAILABLE" ? "success" : "neutral"}
            />
          ),
        },
        {
          key: "actions",
          header: "",
          width: pixel(100),
          renderCell: (lot) => (
            <Button
              label={t("open")}
              variant="ghost"
              size="sm"
              href={`/dashboard/stock/lots/${lot.id}`}
            />
          ),
        },
      ]}
    />
  );
}
