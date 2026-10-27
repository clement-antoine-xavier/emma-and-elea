"use client";

import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {useLocale, useTranslations} from "next-intl";
import {formatBusinessDate, formatMoney, formatPercent} from "@/lib/format";
import type {RecipeVersionSummary} from "@/lib/dto";

export function RecipeVersionTable({
  versions,
  recipeId,
}: {
  versions: RecipeVersionSummary[];
  recipeId: string;
}) {
  const t = useTranslations("Recipes");
  const locale = useLocale();

  return (
    <Table<RecipeVersionSummary>
      data={versions}
      idKey="id"
      density="compact"
      columns={[
        {
          key: "version",
          header: t("columns.version"),
          width: pixel(100),
          renderCell: (version) => `v${version.versionNumber}`,
        },
        {
          key: "status",
          header: t("columns.status"),
          width: pixel(120),
          renderCell: (version) => (
            <Badge
              label={t(`statuses.${version.status}`)}
              variant={
                version.status === "PUBLISHED"
                  ? "success"
                  : version.status === "DRAFT"
                    ? "warning"
                    : "neutral"
              }
            />
          ),
        },
        {
          key: "yield",
          header: t("columns.yield"),
          width: proportional(2),
          renderCell: (version) =>
            `${version.yieldQuantity} ${version.yieldUnitCode}`,
        },
        {
          key: "cost",
          header: t("columns.costPerUnit"),
          width: pixel(130),
          align: "end",
          renderCell: (version) =>
            version.costPerUnit && version.currency
              ? formatMoney(version.costPerUnit, {
                  locale,
                  currency: version.currency,
                })
              : "—",
        },
        {
          key: "margin",
          header: t("columns.margin"),
          width: pixel(100),
          align: "end",
          renderCell: (version) =>
            version.marginPct
              ? formatPercent(version.marginPct, {locale})
              : "—",
        },
        {
          key: "publishedAt",
          header: t("columns.publishedAt"),
          width: pixel(140),
          renderCell: (version) =>
            version.publishedAt
              ? formatBusinessDate(version.publishedAt, {locale})
              : "—",
        },
        {
          key: "actions",
          header: "",
          width: pixel(110),
          renderCell: (version) => (
            <Button
              label={t("open")}
              variant="ghost"
              size="sm"
              href={`/dashboard/recipes/${recipeId}/versions/${version.id}`}
            />
          ),
        },
      ]}
    />
  );
}
