import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getLocale, getTranslations} from "next-intl/server";
import {formatMoney} from "@/lib/format";
import {requireOrganizationActor} from "@/server/auth/actor";
import {homeService} from "@/server/services/container";
import {normalizePeriod} from "@/server/services/home.service";
import {DashboardTables} from "@/components/dashboard/dashboard-tables";
import {
  MetricCard,
  type MetricChange,
} from "@/components/dashboard/metric-card";
import {PeriodFilter} from "@/components/dashboard/period-filter";
import {ProductionChart} from "@/components/dashboard/production-chart";
import {RevenueChart} from "@/components/dashboard/revenue-chart";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type DashboardPageProps = {
  searchParams: Promise<{period?: string | string[]}>;
};

type Metric = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  change?: MetricChange | null;
  sparkline?: number[];
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");

  return {title: t("metadataTitle")};
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const actor = await requireOrganizationActor();
  const params = await searchParams;
  const period = normalizePeriod(params.period);
  const home = await homeService.getHome(actor, period);
  const [t, tRoles, locale] = await Promise.all([
    getTranslations("Dashboard.home"),
    getTranslations("Roles"),
    getLocale(),
  ]);

  const roleLabel = tRoles(`${actor.role}.label`);
  const today = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
  }).format(new Date());

  const metrics: Metric[] = [
    {
      key: "batches",
      label: t("metrics.batchesToday"),
      value: String(home.kpis.batchesToday),
      hint: t("metrics.since", {days: home.period}),
      sparkline: home.productionTrend.map((point) => point.completed),
    },
  ];

  if (home.can.sales) {
    const delta = home.kpis.revenueDeltaPct;
    metrics.push({
      key: "revenue",
      label: t("metrics.revenue"),
      value: formatMoney(home.kpis.revenue, {
        locale,
        currency: home.currency,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }),
      hint: t("metrics.vsPrevious"),
      change:
        delta === null
          ? null
          : {
              value: `${delta > 0 ? "+" : ""}${delta}%`,
              positive: delta >= 0,
            },
      sparkline: home.salesTrend.map((point) => point.revenue),
    });
  } else {
    metrics.push({
      key: "planned",
      label: t("metrics.plannedBatches"),
      value: String(home.kpis.plannedBatches),
      hint: t("metrics.since", {days: home.period}),
    });
  }

  metrics.push({
    key: "lowStock",
    label: t("metrics.lowStock"),
    value: String(home.kpis.lowStockCount),
    hint: t("metrics.since", {days: home.period}),
  });

  if (home.can.finance && home.kpis.wasteCost !== null) {
    metrics.push({
      key: "waste",
      label: t("metrics.wasteCost"),
      value: formatMoney(home.kpis.wasteCost, {
        locale,
        currency: home.currency,
      }),
      hint: t("metrics.since", {days: home.period}),
    });
  } else if (home.can.reports) {
    metrics.push({
      key: "expiring",
      label: t("metrics.expiringLots"),
      value: String(home.kpis.expiringLotsCount),
      hint: t("metrics.since", {days: home.period}),
    });
  } else if (home.can.orders) {
    metrics.push({
      key: "orders",
      label: t("metrics.orders"),
      value: String(home.kpis.orderCount),
      hint: t("metrics.allTime"),
    });
  } else {
    const completed = home.productionTrend.reduce(
      (total, point) => total + point.completed,
      0,
    );
    metrics.push({
      key: "completed",
      label: t("metrics.completedBatches"),
      value: String(completed),
      hint: t("metrics.since", {days: home.period}),
    });
  }

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <HStack
            gap={4}
            align="start"
            justify="between"
            wrap="wrap"
            width="100%"
          >
            <Stack gap={1}>
              <Text type="label" color="accent">
                {t("eyebrow")}
              </Text>
              <Heading level={1} type="display-3">
                {t("title", {name: actor.name})}
              </Heading>
              <Text type="large" color="secondary">
                {t("intro", {
                  organization: actor.organization.name,
                  role: roleLabel,
                  date: today,
                })}
              </Text>
              <HStack gap={2} wrap="wrap">
                <Badge
                  label={actor.organization.slug}
                  variant="neutral"
                />
                {actor.isSupport ? (
                  <Badge label={t("supportBadge")} variant="warning" />
                ) : null}
              </HStack>
            </Stack>
            <Stack gap={3} align="end">
              <PeriodFilter
                period={home.period}
                label={t("periodLabel")}
                options={[
                  {value: 7, label: t("periods.7")},
                  {value: 30, label: t("periods.30")},
                  {value: 90, label: t("periods.90")},
                ]}
              />
              {home.can.productionWrite ? (
                <Button
                  variant="secondary"
                  label={t("newProduction")}
                  href="/dashboard/production"
                />
              ) : null}
            </Stack>
          </HStack>

          <Grid columns={{minWidth: 220, max: 4}} gap={4}>
            {metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                value={metric.value}
                hint={metric.hint}
                change={metric.change}
                sparkline={metric.sparkline}
              />
            ))}
          </Grid>

          {home.can.sales || home.can.production ? (
            <Grid
              columns={{
                minWidth: 360,
                max: home.can.sales && home.can.production ? 2 : 1,
              }}
              gap={4}
            >
              {home.can.sales ? (
                <RevenueChart
                  data={home.salesTrend}
                  title={t("charts.revenueTitle")}
                  intro={t("charts.revenueIntro")}
                  currency={home.currency}
                />
              ) : null}
              {home.can.production ? (
                <ProductionChart
                  data={home.productionTrend}
                  title={t("charts.productionTitle")}
                  intro={t("charts.productionIntro")}
                  label={t("charts.completed")}
                />
              ) : null}
            </Grid>
          ) : null}

          <DashboardTables
            alerts={home.alerts}
            orders={home.recentOrders}
            batches={home.upcomingBatches}
            currency={home.currency}
            can={home.can}
          />

          {actor.isSupport ? (
            <Section variant="muted" padding={4}>
              <Text type="supporting">{t("supportNote")}</Text>
            </Section>
          ) : null}
        </Stack>
      </Center>
    </Section>
  );
}
