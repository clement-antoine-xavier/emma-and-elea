import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Stack} from "@astryxdesign/core/Stack";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {PropertyList} from "@/components/layout/property-list";
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
    <PageShell
      title={t("detailTitle")}
      intro={`${formatBusinessDate(plan.plannedFor, {locale})} · ${plan.siteName}`}
      actions={
        <Button
          label={t("back")}
          variant="secondary"
          href={`/dashboard/production/planning?siteId=${plan.siteId}&date=${date}`}
        />
      }
      contentWidth={1280}
    >
      <DetailShell
        asideLabel={t("summary.status")}
        aside={
          <Stack gap={4}>
            <Card padding={5}>
              <PropertyList
                columns="single"
                labelPosition="start"
                items={[
                  {
                    label: t("summary.status"),
                    value: (
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
                    ),
                  },
                  {
                    label: t("summary.source"),
                    value: tSources(plan.source),
                  },
                  {label: t("summary.site"), value: plan.siteName},
                  {
                    label: t("summary.date"),
                    value: formatBusinessDate(plan.plannedFor, {locale}),
                  },
                  {
                    label: t("summary.note"),
                    value: plan.note ?? t("summary.noNote"),
                  },
                ]}
              />
            </Card>
            {view.canWrite ? (
              <Card padding={5}>
                <PlanActions plan={plan} />
              </Card>
            ) : null}
          </Stack>
        }
      >
        <PlanLinesManager
          plan={plan}
          items={view.options.items}
          canWrite={view.canWrite}
        />
      </DetailShell>
    </PageShell>
  );
}
