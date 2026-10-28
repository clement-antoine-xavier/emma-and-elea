import type {Metadata} from "next";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Divider} from "@astryxdesign/core/Divider";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {PropertyList} from "@/components/layout/property-list";
import {PlanCreateForm} from "@/components/production/plan-create-form";
import {PlanningFilters} from "@/components/production/planning-filters";
import {
  ForecastTable,
  OrderDemandTable,
  PlanTable,
} from "@/components/production/planning-tables";
import {formatBusinessDate, formatPercent} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {planningService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Production.planning");

  return {title: t("metadataTitle")};
}

type PlanningSearchParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlanningPage({
  searchParams,
}: PlanningSearchParams) {
  const actor = await requirePermission("production:read");
  const [t, locale, params] = await Promise.all([
    getTranslations("Production.planning"),
    getLocale(),
    searchParams,
  ]);
  const {board, options, canWrite} = await planningService.getBoard(
    actor,
    params,
  );

  const dateParam = board.plannedFor.toISOString().slice(0, 10);

  if (!board.siteId) {
    return (
      <PageShell
        title={t("title")}
        intro={t("intro")}
        actions={
          <Button
            label={t("back")}
            variant="secondary"
            href="/dashboard/production"
          />
        }
      >
        <Card padding={4}>
          <EmptyState
            title={t("noSiteTitle")}
            description={t("noSiteBody")}
          />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      actions={
        <Button
          label={t("back")}
          variant="secondary"
          href="/dashboard/production"
        />
      }
    >
      <Card padding={5}>
        <Stack gap={4}>
          <PlanningFilters
            sites={options.sites}
            siteId={board.siteId}
            date={dateParam}
          />
          <Divider />
          <PropertyList
            items={[
              {
                label: t("summary.site"),
                value: board.siteName ?? "—",
              },
              {
                label: t("summary.date"),
                value: formatBusinessDate(board.plannedFor, {locale}),
              },
              {
                label: t("summary.history"),
                value: t("summary.historyValue", {
                  days: board.historyDays,
                  from: formatBusinessDate(board.historyFrom, {locale}),
                  to: formatBusinessDate(board.historyTo, {locale}),
                }),
              },
              {
                label: t("summary.safety"),
                value: formatPercent(board.safetyPct, {locale}),
              },
            ]}
          />
          {board.eventUpliftPct ? (
            <Banner
              status="info"
              title={t("eventTitle")}
              description={t("eventBody", {
                uplift: formatPercent(board.eventUpliftPct, {locale}),
              })}
            />
          ) : null}
        </Stack>
      </Card>

      <Divider />

      <Stack gap={3}>
        <Stack gap={1}>
          <Heading level={2}>{t("forecast.title")}</Heading>
          <Text type="supporting">{t("forecast.intro")}</Text>
        </Stack>
        {board.suggestions.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("forecast.emptyTitle")}
              description={t("forecast.emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <ForecastTable suggestions={board.suggestions} />
        )}
      </Stack>

      <Stack gap={3}>
        <Stack gap={1}>
          <Heading level={2}>{t("orders.title")}</Heading>
          <Text type="supporting">{t("orders.intro")}</Text>
        </Stack>
        {board.orders.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("orders.emptyTitle")}
              description={t("orders.emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <OrderDemandTable orders={board.orders} />
        )}
      </Stack>

      <Stack gap={3}>
        <Stack gap={1}>
          <Heading level={2}>{t("plans.title")}</Heading>
          <Text type="supporting">{t("plans.intro")}</Text>
        </Stack>
        {board.plans.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("plans.emptyTitle")}
              description={t("plans.emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <PlanTable plans={board.plans} />
        )}
      </Stack>

      {board.openPlanId ? (
        <Card padding={5}>
          <HStack justify="between" align="center" wrap="wrap" gap={4}>
            <Stack gap={1}>
              <Heading level={2}>{t("openPlan.title")}</Heading>
              <Text type="supporting">{t("openPlan.body")}</Text>
            </Stack>
            <Button
              label={t("openPlan.action")}
              variant="primary"
              href={`/dashboard/production/planning/${board.openPlanId}`}
            />
          </HStack>
        </Card>
      ) : (
        <Card padding={5}>
          <PlanCreateForm
            key={`${board.siteId}:${dateParam}`}
            siteId={board.siteId}
            plannedFor={dateParam}
            forecastCount={board.suggestions.length}
            orderCount={board.orders.length}
            canWrite={canWrite}
          />
        </Card>
      )}
    </PageShell>
  );
}
