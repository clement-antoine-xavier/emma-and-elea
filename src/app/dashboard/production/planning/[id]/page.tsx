import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {PlanActions} from "@/components/production/plan-actions";
import {PlanLinesManager} from "@/components/production/plan-lines-manager";
import {formatBusinessDate} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {planningService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type PlanParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: PlanParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("production:read");
  const view = await planningService.getPlan(actor, id);
  const [t, locale] = await Promise.all([
    getTranslations("Production.planning"),
    getLocale(),
  ]);

  return {
    title: view
      ? `${t("detailTitle")} · ${formatBusinessDate(view.plan.plannedFor, {
          locale,
        })}`
      : t("metadataTitle"),
  };
}

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

export default async function PlanDetailPage({params}: PlanParams) {
  const {id} = await params;
  const actor = await requirePermission("production:read");
  const view = await planningService.getPlan(actor, id);

  if (!view) notFound();

  const [t, tStatuses, tSources, locale] = await Promise.all([
    getTranslations("Production.planning"),
    getTranslations("Production.planning.statuses"),
    getTranslations("Production.planning.sources"),
    getLocale(),
  ]);

  const plan = view.plan;
  const date = plan.plannedFor.toISOString().slice(0, 10);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={t("detailTitle")}
            intro={`${formatBusinessDate(plan.plannedFor, {locale})} · ${plan.siteName}`}
            actions={
              <Button
                label={t("back")}
                variant="secondary"
                href={`/dashboard/production/planning?siteId=${plan.siteId}&date=${date}`}
              />
            }
          />

          <Card padding={5}>
            <Grid columns={{minWidth: 180, max: 3}} gap={4}>
              <Stack gap={1}>
                <Text type="label" color="secondary">
                  {t("summary.status")}
                </Text>
                <HStack gap={2}>
                  <Badge
                    label={tStatuses(plan.status)}
                    variant={
                      plan.status === "CONFIRMED"
                        ? "success"
                        : plan.status === "DRAFT"
                          ? "warning"
                          : "neutral"
                    }
                  />
                </HStack>
              </Stack>
              <Definition
                label={t("summary.source")}
                value={tSources(plan.source)}
              />
              <Definition
                label={t("summary.site")}
                value={plan.siteName}
              />
              <Definition
                label={t("summary.date")}
                value={formatBusinessDate(plan.plannedFor, {locale})}
              />
              <Definition
                label={t("summary.note")}
                value={plan.note ?? t("summary.noNote")}
              />
            </Grid>
          </Card>

          {view.canWrite ? <PlanActions plan={plan} /> : null}

          <PlanLinesManager
            plan={plan}
            items={view.options.items}
            canWrite={view.canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
