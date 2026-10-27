"use client";

import {Badge} from "@astryxdesign/core/Badge";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {formatMoney, formatQuantity} from "@/lib/format";
import type {
  ProductionBatchInputRecord,
  ProductionBatchOutputRecord,
} from "@/lib/dto";

export function BatchInputsTable({
  inputs,
  currency,
}: {
  inputs: ProductionBatchInputRecord[];
  currency: string;
}) {
  const t = useTranslations("Production.inputs");
  const locale = useLocale();

  return (
    <Table<ProductionBatchInputRecord>
      data={inputs}
      idKey="id"
      density="compact"
      columns={[
        {
          key: "lot",
          header: t("columns.lot"),
          width: pixel(160),
          renderCell: (input) => input.lotNumber,
        },
        {
          key: "item",
          header: t("columns.item"),
          width: proportional(3),
          renderCell: (input) => input.itemName,
        },
        {
          key: "quantity",
          header: t("columns.quantity"),
          width: pixel(130),
          align: "end",
          renderCell: (input) =>
            `${formatQuantity(input.quantity, {locale})} ${input.unitCode}`,
        },
        {
          key: "unitCost",
          header: t("columns.unitCost"),
          width: pixel(130),
          align: "end",
          renderCell: (input) =>
            formatMoney(input.unitCost, {
              locale,
              currency,
              minimumFractionDigits: 3,
              maximumFractionDigits: 4,
            }),
        },
      ]}
    />
  );
}

export function BatchOutputsTable({
  outputs,
  currency,
}: {
  outputs: ProductionBatchOutputRecord[];
  currency: string;
}) {
  const t = useTranslations("Production.outputs");
  const locale = useLocale();

  return (
    <Table<ProductionBatchOutputRecord>
      data={outputs}
      idKey="id"
      density="compact"
      columns={[
        {
          key: "lot",
          header: t("columns.lot"),
          width: pixel(160),
          renderCell: (output) => output.lotNumber ?? "—",
        },
        {
          key: "item",
          header: t("columns.item"),
          width: proportional(3),
          renderCell: (output) => (
            <Stack gap={0}>
              <Text weight="semibold">{output.itemName}</Text>
              {output.isPrimary ? (
                <Text type="supporting" color="secondary">
                  {t("primary")}
                </Text>
              ) : null}
            </Stack>
          ),
        },
        {
          key: "quantity",
          header: t("columns.quantity"),
          width: pixel(130),
          align: "end",
          renderCell: (output) =>
            `${formatQuantity(output.quantity, {locale})} ${output.unitCode}`,
        },
        {
          key: "costPerUnit",
          header: t("columns.costPerUnit"),
          width: pixel(130),
          align: "end",
          renderCell: (output) =>
            output.costPerUnit
              ? formatMoney(output.costPerUnit, {locale, currency})
              : "—",
        },
        {
          key: "status",
          header: "",
          width: pixel(100),
          renderCell: (output) =>
            output.isPrimary ? (
              <Badge label={t("primary")} variant="success" />
            ) : null,
        },
      ]}
    />
  );
}
