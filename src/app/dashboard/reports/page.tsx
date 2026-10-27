import type {Metadata} from "next";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {Grid} from "@astryxdesign/core/Grid";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getLocale, getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
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

function Stat({label, value}: {label: string; value: string}) {
  return (
    <Card padding={5}>
      <Stack gap={1}>
        <Text type="label" color="secondary">
          {label}
        </Text>
        <Heading level={2}>{value}</Heading>
      </Stack>
    </Card>
  );
}

export default async function ReportsPage() {
  const actor = await requirePermission("report:read");
  const [t, locale, report] = await Promise.all([
    getTranslations("Reports"),
    getLocale(),
    reportService.getReports(actor),
  ]);

  const {summary, margins, yields, alerts} = report;

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={8} maxWidth={1120} width="100%">
          <PageHeader
            title={t("title")}
            intro={t("intro", {
              from: formatBusinessDate(summary.from, {locale}),
              to: formatBusinessDate(summary.to, {locale}),
            })}
          />

          <Stack gap={4}>
            <Stack gap={1}>
              <Heading level={2}>{t("summaryTitle")}</Heading>
              <Text type="supporting">{t("summaryIntro")}</Text>
            </Stack>
            <Grid columns={{minWidth: 220, max: 4}} gap={4}>
              <Stat
                label={t("wasteCost")}
                value={formatMoney(summary.wasteCost, {
                  locale,
                  currency: summary.currency,
                })}
              />
              <Stat
                label={t("productionCost")}
                value={formatMoney(summary.productionCost, {
                  locale,
                  currency: summary.currency,
                })}
              />
              <Stat
                label={t("wasteRate")}
                value={formatPercent(summary.wasteRatePct, {locale})}
              />
              <Stat label={t("alertsCount")} value={String(alerts.length)} />
            </Grid>
          </Stack>

          <Stack gap={3}>
            <Heading level={2}>{t("marginsTitle")}</Heading>
            <Text type="supporting">{t("marginsIntro")}</Text>
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
          </Stack>

          <Stack gap={3}>
            <Heading level={2}>{t("yieldsTitle")}</Heading>
            <Text type="supporting">{t("yieldsIntro")}</Text>
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
          </Stack>

          <Stack gap={3}>
            <Heading level={2}>{t("alertsTitle")}</Heading>
            <Text type="supporting">{t("alertsIntro")}</Text>
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
          </Stack>
        </Stack>
      </Center>
    </Section>
  );
}
