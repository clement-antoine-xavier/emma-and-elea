import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
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
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
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
          />
          <EmployeeManager
            members={view.members}
            employees={view.employees}
            sites={view.sites}
            canWrite={view.canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
