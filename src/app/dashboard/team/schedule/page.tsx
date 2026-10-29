import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {HStack} from "@astryxdesign/core/HStack";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {ScheduleFilters} from "@/components/team/schedule-filters";
import {ScheduleManager} from "@/components/team/schedule-manager";
import {WorkloadTable} from "@/components/team/workload-table";
import {formatBusinessDate} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {
  scheduleService,
  workloadService,
} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Team.schedule");

  return {title: t("metadataTitle")};
}

type ScheduleSearchParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SchedulePage({
  searchParams,
}: ScheduleSearchParams) {
  const actor = await requirePermission("team:read");
  const [t, locale, params] = await Promise.all([
    getTranslations("Team.schedule"),
    getLocale(),
    searchParams,
  ]);
  const [view, workload] = await Promise.all([
    scheduleService.getSchedule(actor, params),
    workloadService.getWeek(actor, params),
  ]);
  const week = view.weekStart.toISOString().slice(0, 10);

  return (
    <PageShell
      title={t("title")}
      intro={t("intro", {
        from: formatBusinessDate(view.weekStart, {locale}),
        to: formatBusinessDate(new Date(view.weekEnd.getTime() - 86_400_000), {
          locale,
        }),
      })}
      actions={
        <HStack gap={2} wrap="wrap">
          <Button
            label={t("employeesLink")}
            variant="secondary"
            href="/dashboard/team/employees"
          />
          <Button
            label={t("absencesLink")}
            variant="secondary"
            href="/dashboard/team/absences"
          />
          <Button
            label={t("back")}
            variant="secondary"
            href="/dashboard/team"
          />
        </HStack>
      }
    >
      <Card padding={5}>
        <ScheduleFilters
          sites={view.sites}
          siteId={
            (Array.isArray(params.siteId)
              ? params.siteId[0]
              : params.siteId) ?? ""
          }
          week={week}
        />
      </Card>

      <ScheduleManager
        shifts={view.shifts}
        employees={view.employees}
        sites={view.sites}
        canWrite={view.canWrite}
      />

      <WorkloadTable rows={workload.rows} />
    </PageShell>
  );
}
