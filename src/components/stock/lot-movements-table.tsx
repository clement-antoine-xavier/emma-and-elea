"use client";

import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {useLocale, useTranslations} from "next-intl";
import {formatBusinessDate, formatQuantity} from "@/lib/format";
import type {StockMovementRecord} from "@/lib/dto";

export function LotMovementsTable({
  movements,
}: {
  movements: StockMovementRecord[];
}) {
  const t = useTranslations("Stock.lot");
  const locale = useLocale();

  return (
    <Table<StockMovementRecord>
      data={movements}
      idKey="id"
      density="compact"
      columns={[
        {
          key: "type",
          header: t("columns.type"),
          width: proportional(2),
          renderCell: (movement) =>
            t(`movementTypes.${movement.type}`),
        },
        {
          key: "quantity",
          header: t("columns.quantity"),
          width: pixel(140),
          align: "end",
          renderCell: (movement) =>
            `${formatQuantity(movement.quantity, {locale})} ${movement.unitCode}`,
        },
        {
          key: "occurredAt",
          header: t("columns.occurredAt"),
          width: pixel(160),
          renderCell: (movement) =>
            formatBusinessDate(movement.occurredAt, {locale}),
        },
        {
          key: "reference",
          header: t("columns.reference"),
          width: proportional(2),
          renderCell: (movement) => movement.referenceType ?? "—",
        },
        {
          key: "reason",
          header: t("columns.reason"),
          width: proportional(2),
          renderCell: (movement) => movement.reason ?? "—",
        },
      ]}
    />
  );
}
