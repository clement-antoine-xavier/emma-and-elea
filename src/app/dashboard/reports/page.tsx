import type {Metadata} from "next";
import type {ReactNode} from "react";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Divider} from "@astryxdesign/core/Divider";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {MetricCard} from "@/components/dashboard/metric-card";
import {PeriodFilter} from "@/components/dashboard/period-filter";
import {
  BatchYieldsTable,
  CategoryProfitabilityTable,
  ProductMarginsTable,
  ProductProfitabilityTable,
} from "@/components/reports/report-tables";
import {ProfitabilitySortSelector} from "@/components/reports/profitability-sort-selector";
import {RefreshCostsButton} from "@/components/reports/refresh-costs-button";
import {normalizeProfitabilitySort} from "@/lib/profitability";
import {StockLevelsTable} from "@/components/stock/stock-levels-table";
import {formatBusinessDate, formatMoney, formatPercent} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {reportService} from "@/server/services/container";
import {normalizePeriod} from "@/server/services/home.service";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Reports");

  return {title: t("metadataTitle")};
}

function Band({
  title,
  intro,
  action,
  children,
}: {
  title: string;
  intro: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack gap={3}>
      <HStack justify="between" align="end" gap={3} wrap="wrap">
        <Stack gap={1}>
          <Heading level={2}>{title}</Heading>
          <Text type="supporting">{intro}</Text>
        </Stack>
        {action}
      </HStack>
      {children}
    </Stack>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("report:read");
  const params = await searchParams;
  const sort = normalizeProfitabilitySort(params.sort);
  const period = normalizePeriod(params.period);
  const [t, tPeriod, locale, report] = await Promise.all([
    getTranslations("Reports"),
    getTranslations("Reports.period"),
    getLocale(),
    reportService.getReports(actor, {sort, period}),
  ]);

  const {
    summary,
    margins,
    profitability,
    categoryProfitability,
    yields,
    alerts,
    can,
    from,
    to,
  } = report;
  const dateRange = {
    from: formatBusinessDate(from, {locale}),
    to: formatBusinessDate(to, {locale}),
  };

  return (
    <PageShell
      eyebrow={can.finance ? t("summaryTitle") : t("opsEyebrow")}
      title={t("title")}
      intro={
        can.finance
          ? t("intro", dateRange)
          : t("opsIntro", dateRange)
      }
      actions={
        <HStack gap={2} wrap="wrap" align="end">
          <PeriodFilter
            period={period}
            label={tPeriod("label")}
            options={[7, 30, 90].map((days) => ({
              value: days,
              label: tPeriod("days", {days}),
            }))}
          />
          {can.finance ? (
            <Button
              label={t("exportCsv")}
              variant="secondary"
              href={`/dashboard/reports/export?period=${period}`}
            />
          ) : null}
        </HStack>
      }
      contentWidth={1400}
      hasHeaderDivider
    >
      {summary ? (
        <>
          <Grid columns={{minWidth: 220, max: 4}} gap={4}>
            <MetricCard
              label={t("wasteCost")}
              value={formatMoney(summary.wasteCost, {
                locale,
                currency: summary.currency,
              })}
            />
            <MetricCard
              label={t("productionCost")}
              value={formatMoney(summary.productionCost, {
                locale,
                currency: summary.currency,
              })}
            />
            <MetricCard
              label={t("wasteRate")}
              value={formatPercent(summary.wasteRatePct, {locale})}
            />
            <MetricCard
              label={t("alertsCount")}
              value={String(alerts.length)}
            />
          </Grid>

          <Divider />
        </>
      ) : null}

      {can.finance ? (
        <>
          <Band
            title={t("marginsTitle")}
            intro={t("marginsIntro")}
            action={<RefreshCostsButton />}
          >
            {margins.length === 0 ? (
              <Card padding={4}>
                <EmptyState
                  title={t("emptyMarginsTitle")}
                  description={t("emptyMarginsBody")}
                  isCompact
                />
              </Card>
            ) : (
              <ProductMarginsTable margins={margins} />
            )}
          </Band>

          <Divider />

          <Band
            title={t("profitabilityTitle")}
            intro={t("profitabilityIntro")}
            action={<ProfitabilitySortSelector sort={sort} />}
          >
            {profitability.length === 0 ? (
              <Card padding={4}>
                <EmptyState
                  title={t("emptyProfitabilityTitle")}
                  description={t("emptyProfitabilityBody")}
                  isCompact
                />
              </Card>
            ) : (
              <Stack gap={6}>
                <ProductProfitabilityTable records={profitability} />
                {categoryProfitability.length > 0 ? (
                  <Stack gap={2}>
                    <Heading level={3}>{t("categoriesTitle")}</Heading>
                    <CategoryProfitabilityTable
                      records={categoryProfitability}
                      currency={profitability[0]?.currency ?? "EUR"}
                    />
                  </Stack>
                ) : null}
              </Stack>
            )}
          </Band>

          <Divider />
        </>
      ) : null}

      {can.production ? (
        <>
          <Band title={t("yieldsTitle")} intro={t("yieldsIntro")}>
            {yields.length === 0 ? (
              <Card padding={4}>
                <EmptyState
                  title={t("emptyYieldsTitle")}
                  description={t("emptyYieldsBody")}
                  isCompact
                />
              </Card>
            ) : (
              <BatchYieldsTable yields={yields} />
            )}
          </Band>

          {can.stock ? <Divider /> : null}
        </>
      ) : null}

      {can.stock ? (
        <Band title={t("alertsTitle")} intro={t("alertsIntro")}>
          {alerts.length === 0 ? (
            <Card padding={4}>
              <EmptyState
                title={t("emptyAlertsTitle")}
                description={t("emptyAlertsBody")}
                isCompact
              />
            </Card>
          ) : (
            <StockLevelsTable levels={alerts} />
          )}
        </Band>
      ) : null}
    </PageShell>
  );
}
