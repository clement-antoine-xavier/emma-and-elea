"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Badge} from "@astryxdesign/core/Badge";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {createEmployeeAction} from "@/app/actions/schedule.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormSwitch} from "@/components/form-switch";
import {FormTextInput} from "@/components/form-text-input";
import type {EmployeeChoice, EmployeeProfileRecord} from "@/lib/dto";
import {
  employeeInputSchema,
  type EmployeeInputValues,
} from "@/server/validators/schedule.schema";

function roleLabel(role: string): string {
  return role.replaceAll("_", " ");
}

export function EmployeeManager({
  members,
  employees,
  sites,
  canWrite,
}: {
  members: EmployeeChoice[];
  employees: EmployeeProfileRecord[];
  sites: {id: string; name: string; code: string}[];
  canWrite: boolean;
}) {
  const t = useTranslations("Team.employees");
  const tValidation = useTranslations("Team.schedule.validation");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const availableMembers = members.filter((member) => !member.hasProfile);
  const schema = useMemo(
    () => employeeInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<EmployeeInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      memberId: availableMembers[0]?.memberId ?? "",
      jobTitle: "",
      siteId: sites[0]?.id ?? "",
      weeklyContractHours: "",
      hiredOn: "",
      isActive: true,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: EmployeeInputValues) {
    setError(null);
    const result = await createEmployeeAction(values);
    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }
    reset();
    if (result.employeeId) {
      router.push(`/dashboard/team/employees/${result.employeeId}`);
      router.refresh();
    }
  }

  return (
    <Stack gap={6}>
      {canWrite && availableMembers.length > 0 ? (
        <Card padding={5}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack gap={4}>
              <Stack gap={1}>
                <Heading level={2}>{t("createTitle")}</Heading>
                <Text type="supporting">{t("createIntro")}</Text>
              </Stack>

              {errors.root?.message ? (
                <Banner
                  status="error"
                  title={t("errorTitle")}
                  description={errors.root.message}
                />
              ) : null}

              <FormLayout>
                <FormSelector
                  control={control}
                  name="memberId"
                  label={t("fields.member")}
                  options={availableMembers.map((member) => ({
                    value: member.memberId,
                    label: `${member.name} · ${member.email}`,
                  }))}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="jobTitle"
                  label={t("fields.jobTitle")}
                />
                <FormSelector
                  control={control}
                  name="siteId"
                  label={t("fields.site")}
                  options={[
                    {value: "", label: t("noSite")},
                    ...sites.map((site) => ({
                      value: site.id,
                      label: `${site.code} · ${site.name}`,
                    })),
                  ]}
                />
                <FormTextInput
                  control={control}
                  name="weeklyContractHours"
                  label={t("fields.weeklyHours")}
                  description={t("fields.weeklyHoursHint")}
                />
                <FormDateInput
                  control={control}
                  name="hiredOn"
                  label={t("fields.hiredOn")}
                />
                <FormSwitch
                  control={control}
                  name="isActive"
                  label={t("fields.active")}
                />
              </FormLayout>

              <Button
                type="submit"
                variant="primary"
                label={t("submit")}
                isLoading={isSubmitting}
              />
            </Stack>
          </form>
        </Card>
      ) : null}

      <Stack gap={3}>
        <Heading level={2}>{t("listTitle")}</Heading>
        {error ? (
          <Banner status="error" title={t("errorTitle")} description={error} />
        ) : null}

        {employees.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<EmployeeProfileRecord>
            data={employees}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "name",
                header: t("columns.name"),
                width: proportional(3),
                renderCell: (employee) => (
                  <Stack gap={0}>
                    <Text weight="semibold">{employee.name}</Text>
                    <Text type="supporting" color="secondary">
                      {employee.email}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: "role",
                header: t("columns.role"),
                width: pixel(140),
                renderCell: (employee) => roleLabel(employee.role),
              },
              {
                key: "job",
                header: t("columns.job"),
                width: proportional(2),
                renderCell: (employee) => employee.jobTitle ?? "—",
              },
              {
                key: "site",
                header: t("columns.site"),
                width: proportional(2),
                renderCell: (employee) => employee.siteName ?? "—",
              },
              {
                key: "hours",
                header: t("columns.hours"),
                width: pixel(100),
                align: "end",
                renderCell: (employee) =>
                  employee.weeklyContractHours
                    ? `${employee.weeklyContractHours} h`
                    : "—",
              },
              {
                key: "availability",
                header: t("columns.availability"),
                width: pixel(110),
                align: "end",
                renderCell: (employee) => String(employee.availabilityCount),
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(100),
                renderCell: (employee) => (
                  <Badge
                    label={employee.isActive ? t("active") : t("inactive")}
                    variant={employee.isActive ? "success" : "neutral"}
                  />
                ),
              },
              {
                key: "actions",
                header: "",
                width: pixel(100),
                renderCell: (employee) => (
                  <Button
                    label={t("open")}
                    variant="ghost"
                    size="sm"
                    href={`/dashboard/team/employees/${employee.id}`}
                  />
                ),
              },
            ]}
          />
        )}
      </Stack>
    </Stack>
  );
}
