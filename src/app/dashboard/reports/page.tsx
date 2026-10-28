import type {Metadata} from "next";
import type {ReactNode} from "react";
import {Card} from "@astryxdesign/core/Card";
import {Divider} from "@astryxdesign/core/Divider";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {Grid} from "@astryxdesign/core/Grid";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {MetricCard} from "@/components/dashboard/metric-card";
import {
  BatchYieldsTable,
  ProductMarginsTable,
} from "@/components/reports/report-tables";
import {StockLevelsTable} from "@/components/stock/stock-levels-table";
import {formatBusinessDate, formatMoney, formatPercent} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {reportService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Reports");

  return {title: t("metadataTitle")};
}

function Band({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <Stack gap={3}>
      <Stack gap={1}>
        <Heading level={2}>{title}</Heading>
        <Text type="supporting">{intro}</Text>
      </Stack>
      {children}
    </Stack>
  );
}

export default async function ReportsPage() {
  const actor = await requirePermission("report:read");
  const [t, locale, report] = await Promise.all([
    getTranslations("Reports"),
    getLocale(),
    reportService.getReports(actor),
  ]);

  const {summary, margins, yields, alerts, can, from, to} = report;
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
          <Band title={t("marginsTitle")} intro={t("marginsIntro")}>
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
