import type {Metadata} from "next";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {AvailabilityManager} from "@/components/team/availability-manager";
import {EmployeeEditForm} from "@/components/team/employee-edit-form";
import {formatBusinessDate} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {scheduleService} from "@/server/services/container";

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

export default async function EmployeeDetailPage({params}: EmployeeParams) {
  const {id} = await params;
  const actor = await requirePermission("team:read");
  const [view, team, t, locale] = await Promise.all([
    scheduleService.getEmployee(actor, id),
    scheduleService.getEmployees(actor),
    getTranslations("Team.employees"),
    getLocale(),
  ]);

  if (!view) notFound();

  const employee = view.employee;

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={employee.name}
            intro={`${employee.email} · ${employee.role.replaceAll("_", " ")}`}
            actions={
              <Button
                label={t("backToList")}
                variant="secondary"
                href="/dashboard/team/employees"
              />
            }
          />

          {!employee.isActive ? (
            <Banner
              status="warning"
              title={t("inactiveTitle")}
              description={t("inactiveBody")}
            />
          ) : null}

          {view.canWrite ? (
            <EmployeeEditForm
              employee={employee}
              sites={team.sites}
              canWrite={view.canWrite}
            />
          ) : (
            <Card padding={5}>
              <Grid columns={{minWidth: 180, max: 3}} gap={4}>
                <Definition
                  label={t("fields.jobTitle")}
                  value={employee.jobTitle ?? "—"}
                />
                <Definition
                  label={t("fields.site")}
                  value={employee.siteName ?? t("noSite")}
                />
                <Definition
                  label={t("fields.weeklyHours")}
                  value={
                    employee.weeklyContractHours
                      ? `${employee.weeklyContractHours} h`
                      : "—"
                  }
                />
                <Definition
                  label={t("fields.hiredOn")}
                  value={
                    employee.hiredOn
                      ? formatBusinessDate(employee.hiredOn, {locale})
                      : "—"
                  }
                />
              </Grid>
            </Card>
          )}

          <AvailabilityManager
            employeeId={employee.id}
            availability={view.availability}
            canWrite={view.canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
