import type {Metadata} from "next";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Stack} from "@astryxdesign/core/Stack";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {PropertyList} from "@/components/layout/property-list";
import {AvailabilityManager} from "@/components/team/availability-manager";
import {EmployeeEditForm} from "@/components/team/employee-edit-form";
import {EmployeeSkillsManager} from "@/components/team/employee-skills-manager";
import {formatBusinessDate} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {
  scheduleService,
  skillService,
} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type EmployeeParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: EmployeeParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("team:read");
  const view = await scheduleService.getEmployee(actor, id);
  const t = await getTranslations("Team.employees");

  return {
    title: view ? `${view.employee.name} · ${t("title")}` : t("metadataTitle"),
  };
}

export default async function EmployeeDetailPage({params}: EmployeeParams) {
  const {id} = await params;
  const actor = await requirePermission("team:read");
  const [view, team, skillCatalog, employeeSkills, t, locale] =
    await Promise.all([
      scheduleService.getEmployee(actor, id),
      scheduleService.getEmployees(actor),
      skillService.getSkills(actor),
      skillService.getEmployeeSkills(actor, id),
      getTranslations("Team.employees"),
      getLocale(),
    ]);

  if (!view) notFound();

  const employee = view.employee;

  return (
    <PageShell
      title={employee.name}
      intro={`${employee.email} · ${employee.role.replaceAll("_", " ")}`}
      actions={
        <Button
          label={t("backToList")}
          variant="secondary"
          href="/dashboard/team/employees"
        />
      }
      contentWidth={1200}
    >
      {!employee.isActive ? (
        <Banner
          status="warning"
          title={t("inactiveTitle")}
          description={t("inactiveBody")}
        />
      ) : null}

      <DetailShell
        asideLabel={t("fields.jobTitle")}
        aside={
          <Card padding={5}>
            <PropertyList
              columns="single"
              labelPosition="start"
              items={[
                {
                  label: t("fields.jobTitle"),
                  value: employee.jobTitle ?? "—",
                },
                {
                  label: t("fields.site"),
                  value: employee.siteName ?? t("noSite"),
                },
                {
                  label: t("fields.weeklyHours"),
                  value: employee.weeklyContractHours
                    ? `${employee.weeklyContractHours} h`
                    : "—",
                },
                {
                  label: t("fields.hiredOn"),
                  value: employee.hiredOn
                    ? formatBusinessDate(employee.hiredOn, {locale})
                    : "—",
                },
              ]}
            />
          </Card>
        }
      >
        <Stack gap={6}>
          {view.canWrite ? (
            <EmployeeEditForm
              employee={employee}
              sites={team.sites}
              canWrite={view.canWrite}
            />
          ) : null}

          <EmployeeSkillsManager
            employeeId={employee.id}
            skills={skillCatalog.skills}
            assigned={employeeSkills.skills}
            canWrite={employeeSkills.canWrite}
          />

          <AvailabilityManager
            employeeId={employee.id}
            availability={view.availability}
            canWrite={view.canWrite}
          />
        </Stack>
      </DetailShell>
    </PageShell>
  );
}
