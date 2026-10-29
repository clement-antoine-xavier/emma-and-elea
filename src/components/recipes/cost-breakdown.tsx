"use client";

import {useState} from "react";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {refreshRecipeCostAction} from "@/app/actions/recipe.actions";
import {
  formatBusinessDate,
  formatMoney,
  formatPercent,
  formatQuantity,
} from "@/lib/format";
import type {
  RecipeCostLineRecord,
  RecipeCostRecord,
} from "@/lib/dto";

function Definition({label, value}: {label: string; value: string}) {
  return (
    <Stack gap={1}>
      <Text type="label" color="secondary">
        {label}
      </Text>
      <Text>{value}</Text>
    </Stack>
  );
}

export function CostBreakdown({
  cost,
  versionId,
  canRefresh = false,
}: {
  cost: RecipeCostRecord;
  versionId?: string;
  canRefresh?: boolean;
}) {
  const t = useTranslations("Recipes.cost");
  const locale = useLocale();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const money = (value: string) =>
    formatMoney(value, {locale, currency: cost.currency});

  async function refresh() {
    if (!versionId) return;

    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const result = await refreshRecipeCostAction({id: versionId});
      if (!result.ok) {
        setRefreshError(t("refreshError"));
        return;
      }
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading level={2}>{t("title")}</Heading>
        <Text type="supporting">
          {cost.computedAt
            ? t("snapshotAt", {
                date: formatBusinessDate(cost.computedAt, {locale}),
              })
            : t("livePreview")}
        </Text>
      </Stack>

      {cost.isStale ? (
        <HStack gap={3} align="center" wrap="wrap">
          <Banner
            status="warning"
            title={t("staleTitle")}
            description={t("staleBody")}
          />
          {canRefresh && versionId ? (
            <Button
              label={t("refresh")}
              variant="secondary"
              isLoading={isRefreshing}
              onClick={refresh}
            />
          ) : null}
        </HStack>
      ) : null}

      {refreshError ? (
        <Banner status="error" title={t("refreshTitle")} description={refreshError} />
      ) : null}

      {cost.warnings.length > 0 ? (
        <Banner
          status="warning"
          title={t("warningsTitle")}
          description={cost.warnings
            .map((warning) => t(`warnings.${warning.code}`, {subject: warning.subject}))
            .join(" ")}
        />
      ) : null}

      <Card padding={5}>
        <Grid columns={{minWidth: 160, max: 4}} gap={4}>
          <Definition label={t("material")} value={money(cost.materialCost)} />
          <Definition label={t("packaging")} value={money(cost.packagingCost)} />
          <Definition label={t("labour")} value={money(cost.labourCost)} />
          <Definition label={t("energy")} value={money(cost.energyCost)} />
          <Definition label={t("overhead")} value={money(cost.overheadCost)} />
          <Definition label={t("total")} value={money(cost.totalCost)} />
          <Definition label={t("costPerUnit")} value={money(cost.costPerUnit)} />
          <Definition
            label={t("margin")}
            value={
              cost.marginPct
                ? formatPercent(cost.marginPct, {locale})
                : t("noMargin")
            }
          />
        </Grid>
      </Card>

      <Table<RecipeCostLineRecord>
        data={cost.lines}
        idKey="id"
        density="compact"
        columns={[
          {
            key: "kind",
            header: t("columns.kind"),
            width: proportional(1),
            renderCell: (line) => t(`kinds.${line.kind}`),
          },
          {
            key: "label",
            header: t("columns.label"),
            width: proportional(3),
            renderCell: (line) => line.label,
          },
          {
            key: "quantity",
            header: t("columns.quantity"),
            width: pixel(120),
            align: "end",
            renderCell: (line) =>
              line.quantity
                ? `${formatQuantity(line.quantity, {locale})} ${
                    line.unitCode ?? t("minutes")
                  }`
                : "—",
          },
          {
            key: "unitCost",
            header: t("columns.unitCost"),
            width: pixel(120),
            align: "end",
            renderCell: (line) =>
              line.unitCost
                ? formatMoney(line.unitCost, {
                    locale,
                    currency: cost.currency,
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 4,
                  })
                : "—",
          },
          {
            key: "amount",
            header: t("columns.amount"),
            width: pixel(120),
            align: "end",
            renderCell: (line) => money(line.amount),
          },
        ]}
      />
    </Stack>
  );
}
