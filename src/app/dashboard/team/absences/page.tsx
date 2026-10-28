import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {HStack} from "@astryxdesign/core/HStack";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {AbsenceManager} from "@/components/team/absence-manager";
import {can} from "@/lib/permissions";
import {requirePermission} from "@/server/auth/actor";
import {scheduleService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Team.absences");

  return {title: t("metadataTitle")};
}

export default async function AbsencesPage() {
  const actor = await requirePermission("absence:read");
  const t = await getTranslations("Team.absences");
  const view = await scheduleService.getAbsences(actor, {});
  const canSeeTeam = can(actor.role, "team:read");

  return (
    <PageShell
      title={t("pageTitle")}
      intro={t("pageIntro")}
      actions={
        <HStack gap={2} wrap="wrap">
          {canSeeTeam ? (
            <Button
              label={t("scheduleLink")}
              variant="secondary"
              href="/dashboard/team/schedule"
            />
          ) : null}
          {canSeeTeam ? (
            <Button
              label={t("employeesLink")}
              variant="secondary"
              href="/dashboard/team/employees"
            />
          ) : null}
          {canSeeTeam ? (
            <Button
              label={t("back")}
              variant="secondary"
              href="/dashboard/team"
            />
          ) : null}
        </HStack>
      }
    >
      <AbsenceManager
        absences={view.absences}
        employees={view.employees}
        canRequest={view.canRequest}
        canDecide={view.canDecide}
        currentEmployee={view.currentEmployee}
      />
    </PageShell>
  );
}
