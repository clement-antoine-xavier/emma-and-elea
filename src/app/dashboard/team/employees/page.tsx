import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {HStack} from "@astryxdesign/core/HStack";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {EmployeeManager} from "@/components/team/employee-manager";
import {requirePermission} from "@/server/auth/actor";
import {scheduleService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Team.employees");

  return {title: t("metadataTitle")};
}

export default async function EmployeesPage() {
  const actor = await requirePermission("team:read");
  const t = await getTranslations("Team.employees");
  const view = await scheduleService.getEmployees(actor);

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      actions={
        <HStack gap={2} wrap="wrap">
          <Button
            label={t("scheduleLink")}
            variant="secondary"
            href="/dashboard/team/schedule"
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
      <EmployeeManager
        members={view.members}
        employees={view.employees}
        sites={view.sites}
        canWrite={view.canWrite}
      />
    </PageShell>
  );
}
