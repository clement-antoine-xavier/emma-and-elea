"use client";

import {useState} from "react";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {createReplenishmentReceiptAction} from "@/app/actions/replenishment.actions";
import {formatMoney, formatQuantity} from "@/lib/format";
import type {ReplenishmentSuggestionRecord} from "@/lib/dto";

export function ReplenishmentTable({
  suggestions,
  canWrite,
}: {
  suggestions: ReplenishmentSuggestionRecord[];
  canWrite: boolean;
}) {
  const t = useTranslations("Stock.replenishment");
  const tErrors = useTranslations("Settings.errors");
  const locale = useLocale();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(suggestion: ReplenishmentSuggestionRecord) {
    if (!suggestion.supplierId || !suggestion.unitPrice) return;

    setPendingId(`${suggestion.siteId}:${suggestion.itemId}`);
    setError(null);

    try {
      const result = await createReplenishmentReceiptAction({
        siteId: suggestion.siteId,
        supplierId: suggestion.supplierId,
        itemId: suggestion.itemId,
        quantity: suggestion.suggestedQuantity,
        unitId: suggestion.unitId,
        unitPrice: suggestion.unitPrice,
      });

      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }

      router.push(`/dashboard/purchasing/receipts/${result.receiptId}`);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      <Table<ReplenishmentSuggestionRecord>
        data={suggestions}
        idKey={(row) => `${row.siteId}:${row.itemId}`}
        density="compact"
        columns={[
          {
            key: "item",
            header: t("columns.item"),
            width: proportional(3),
            renderCell: (row) => (
              <Text weight="semibold">{row.itemName}</Text>
            ),
          },
          {
            key: "site",
            header: t("columns.site"),
            width: proportional(2),
            renderCell: (row) => row.siteName,
          },
          {
            key: "onHand",
            header: t("columns.onHand"),
            width: pixel(100),
            align: "end",
            renderCell: (row) =>
              `${formatQuantity(row.onHand, {locale})} ${row.unitCode}`,
          },
          {
            key: "open",
            header: t("columns.open"),
            width: pixel(100),
            align: "end",
            renderCell: (row) =>
              `${formatQuantity(row.openDraftQuantity, {locale})} ${row.unitCode}`,
          },
          {
            key: "suggested",
            header: t("columns.suggested"),
            width: pixel(110),
            align: "end",
            renderCell: (row) =>
              `${formatQuantity(row.suggestedQuantity, {locale})} ${row.unitCode}`,
          },
          {
            key: "supplier",
            header: t("columns.supplier"),
            width: proportional(2),
            renderCell: (row) => row.supplierName ?? t("noSupplier"),
          },
          {
            key: "price",
            header: t("columns.price"),
            width: pixel(110),
            align: "end",
            renderCell: (row) =>
              row.unitPrice
                ? formatMoney(row.unitPrice, {
                    locale,
                    currency: row.currency,
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 4,
                  })
                : "—",
          },
          {
            key: "actions",
            header: "",
            width: pixel(150),
            renderCell: (row) =>
              canWrite && row.supplierId && row.unitPrice ? (
                <Button
                  label={t("create")}
                  variant="secondary"
                  size="sm"
                  isLoading={
                    pendingId === `${row.siteId}:${row.itemId}`
                  }
                  onClick={() => create(row)}
                />
              ) : null,
          },
        ]}
      />
    </>
  );
}
