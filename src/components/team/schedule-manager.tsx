"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {AlertDialog} from "@astryxdesign/core/AlertDialog";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {HStack} from "@astryxdesign/core/HStack";
import {Selector} from "@astryxdesign/core/Selector";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  assignEmployeeAction,
  createShiftAction,
  removeAssignmentAction,
  removeShiftAction,
} from "@/app/actions/schedule.actions";
import {FormDateTimeInput} from "@/components/form-date-time-input";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {
  formatZonedDate,
  formatZonedTime,
} from "@/lib/format";
import type {EmployeeOption, ShiftRecord} from "@/lib/dto";
import {
  SHIFT_KINDS,
  assignmentInputSchema,
  shiftInputSchema,
  type AssignmentInputValues,
  type ShiftInputValues,
} from "@/server/validators/schedule.schema";

export function ScheduleManager({
  shifts,
  employees,
  sites,
  canWrite,
}: {
  shifts: ShiftRecord[];
  employees: EmployeeOption[];
  sites: {id: string; name: string; code: string}[];
  canWrite: boolean;
}) {
  const t = useTranslations("Team.schedule");
  const tKinds = useTranslations("Team.shiftKinds");
  const tValidation = useTranslations("Team.schedule.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [shiftToRemove, setShiftToRemove] = useState<string | null>(null);
  const [isRemovingShift, setIsRemovingShift] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState("");
  const [isRemovingAssignment, setIsRemovingAssignment] = useState(false);

  const shiftSchema = useMemo(
    () => shiftInputSchema((key) => tValidation(key)),
    [tValidation],
  );
  const assignSchema = useMemo(
    () => assignmentInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const createForm = useForm<ShiftInputValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      siteId: sites[0]?.id ?? "",
      startsAt: "",
      endsAt: "",
      kind: "PRODUCTION",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  const assignForm = useForm<AssignmentInputValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      shiftId: shifts[0]?.id ?? "",
      employeeId: employees[0]?.id ?? "",
      role: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function createShift(values: ShiftInputValues) {
    setError(null);
    const result = await createShiftAction(values);
    if (!result.ok) {
      createForm.setError("root", {
        type: "server",
        message: tErrors(result.error),
      });
      return;
    }
    createForm.reset({
      siteId: values.siteId,
      startsAt: "",
      endsAt: "",
      kind: values.kind,
      note: "",
    });
    if (result.shiftId) {
      assignForm.setValue("shiftId", result.shiftId);
    }
    router.refresh();
  }

  async function assign(values: AssignmentInputValues) {
    setError(null);
    const result = await assignEmployeeAction(values.shiftId, values);
    if (!result.ok) {
      assignForm.setError("root", {
        type: "server",
        message: tErrors(result.error),
      });
      return;
    }
    assignForm.reset({
      shiftId: values.shiftId,
      employeeId: values.employeeId,
      role: "",
    });
    router.refresh();
  }

  async function removeAssignment() {
    setError(null);
    const assignment = allAssignments.find(
      (candidate) => candidate.id === assignmentToRemove,
    );
    if (!assignment) return;
    setIsRemovingAssignment(true);
    const result = await removeAssignmentAction({
      shiftId: assignment.shiftId,
      assignmentId: assignment.id,
    });
    setIsRemovingAssignment(false);
    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }
    setAssignmentToRemove("");
    router.refresh();
  }

  async function removeShift() {
    if (!shiftToRemove) return;
    setError(null);
    setIsRemovingShift(true);
    const result = await removeShiftAction({id: shiftToRemove});
    setIsRemovingShift(false);
    setShiftToRemove(null);
    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }
    router.refresh();
  }

  const allAssignments = shifts.flatMap((shift) =>
    shift.assignments.map((assignment) => ({
      id: assignment.id,
      shiftId: shift.id,
      employeeName: assignment.employeeName,
      label: `${formatZonedDate(shift.startsAt, {
        locale,
        timeZone: shift.timeZone,
      })} ${formatZonedTime(shift.startsAt, {
        locale,
        timeZone: shift.timeZone,
      })} · ${assignment.employeeName}`,
    })),
  );

  return (
    <Stack gap={6}>
      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      {employees.length === 0 ? (
        <Banner
          status="info"
          title={t("noEmployeesTitle")}
          description={t("noEmployeesBody")}
        />
      ) : null}

      <Stack gap={3}>
        <Heading level={2}>{t("listTitle")}</Heading>
        <Text type="supporting">{t("listIntro")}</Text>

        {shifts.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<ShiftRecord>
            data={shifts}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "date",
                header: t("columns.date"),
                width: pixel(130),
                renderCell: (shift) =>
                  formatZonedDate(shift.startsAt, {
                    locale,
                    timeZone: shift.timeZone,
                  }),
              },
              {
                key: "time",
                header: t("columns.time"),
                width: pixel(130),
                renderCell: (shift) =>
                  `${formatZonedTime(shift.startsAt, {
                    locale,
                    timeZone: shift.timeZone,
                  })} – ${formatZonedTime(shift.endsAt, {
                    locale,
                    timeZone: shift.timeZone,
                  })}`,
              },
              {
                key: "site",
                header: t("columns.site"),
                width: proportional(2),
                renderCell: (shift) => shift.siteName,
              },
              {
                key: "kind",
                header: t("columns.kind"),
                width: pixel(120),
                renderCell: (shift) => tKinds(shift.kind),
              },
              {
                key: "assignments",
                header: t("columns.assignments"),
                width: proportional(3),
                renderCell: (shift) => (
                  <Stack gap={0}>
                    {shift.assignments.length === 0 ? (
                      <Text color="secondary">{t("unassigned")}</Text>
                    ) : (
                      shift.assignments.map((assignment) => (
                        <Text key={assignment.id}>
                          {assignment.employeeName}
                          {assignment.role ? ` · ${assignment.role}` : ""}
                        </Text>
                      ))
                    )}
                  </Stack>
                ),
              },
              {
                key: "actions",
                header: "",
                width: pixel(100),
                renderCell: (shift) =>
                  canWrite ? (
                    <HStack gap={2}>
                      <Button
                        label={t("removeShift")}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShiftToRemove(shift.id)}
                      />
                    </HStack>
                  ) : null,
              },
            ]}
          />
        )}
      </Stack>

      {canWrite ? (
        <>
          <Card padding={5}>
            <form onSubmit={createForm.handleSubmit(createShift)} noValidate>
              <Stack gap={4}>
                <Stack gap={1}>
                  <Heading level={2}>{t("createTitle")}</Heading>
                  <Text type="supporting">{t("createIntro")}</Text>
                </Stack>

                {createForm.formState.errors.root?.message ? (
                  <Banner
                    status="error"
                    title={t("createErrorTitle")}
                    description={createForm.formState.errors.root.message}
                  />
                ) : null}

                <FormLayout>
                  <FormSelector
                    control={createForm.control}
                    name="siteId"
                    label={t("fields.site")}
                    options={sites.map((site) => ({
                      value: site.id,
                      label: `${site.code} · ${site.name}`,
                    }))}
                    isRequired
                  />
                  <FormDateTimeInput
                    control={createForm.control}
                    name="startsAt"
                    label={t("fields.startsAt")}
                    isRequired
                  />
                  <FormDateTimeInput
                    control={createForm.control}
                    name="endsAt"
                    label={t("fields.endsAt")}
                    isRequired
                  />
                  <FormSelector
                    control={createForm.control}
                    name="kind"
                    label={t("fields.kind")}
                    options={SHIFT_KINDS.map((kind) => ({
                      value: kind,
                      label: tKinds(kind),
                    }))}
                  />
                  <FormTextInput
                    control={createForm.control}
                    name="note"
                    label={t("fields.note")}
                  />
                </FormLayout>

                <Button
                  type="submit"
                  variant="primary"
                  label={t("createSubmit")}
                  isLoading={createForm.formState.isSubmitting}
                />
              </Stack>
            </form>
          </Card>

          {shifts.length > 0 && employees.length > 0 ? (
            <Card padding={5}>
              <form onSubmit={assignForm.handleSubmit(assign)} noValidate>
                <Stack gap={4}>
                  <Stack gap={1}>
                    <Heading level={2}>{t("assignTitle")}</Heading>
                    <Text type="supporting">{t("assignIntro")}</Text>
                  </Stack>

                  {assignForm.formState.errors.root?.message ? (
                    <Banner
                      status="error"
                      title={t("assignErrorTitle")}
                      description={assignForm.formState.errors.root.message}
                    />
                  ) : null}

                  <FormLayout>
                    <FormSelector
                      control={assignForm.control}
                      name="shiftId"
                      label={t("fields.shift")}
                      options={shifts.map((shift) => ({
                        value: shift.id,
                        label: `${formatZonedDate(shift.startsAt, {
                          locale,
                          timeZone: shift.timeZone,
                        })} ${formatZonedTime(shift.startsAt, {
                          locale,
                          timeZone: shift.timeZone,
                        })} · ${shift.siteName}`,
                      }))}
                      isRequired
                    />
                    <FormSelector
                      control={assignForm.control}
                      name="employeeId"
                      label={t("fields.employee")}
                      options={employees.map((employee) => ({
                        value: employee.id,
                        label: employee.jobTitle
                          ? `${employee.name} · ${employee.jobTitle}`
                          : employee.name,
                      }))}
                      isRequired
                    />
                    <FormTextInput
                      control={assignForm.control}
                      name="role"
                      label={t("fields.role")}
                    />
                  </FormLayout>

                  <Button
                    type="submit"
                    variant="primary"
                    label={t("assignSubmit")}
                    isLoading={assignForm.formState.isSubmitting}
                  />
                </Stack>
              </form>
            </Card>
          ) : null}

          {allAssignments.length > 0 ? (
            <Card padding={5}>
              <Stack gap={4}>
                <Stack gap={1}>
                  <Heading level={2}>{t("removeAssignmentTitle")}</Heading>
                  <Text type="supporting">
                    {t("removeAssignmentIntro")}
                  </Text>
                </Stack>
                <Selector
                  label={t("fields.assignment")}
                  value={assignmentToRemove}
                  onChange={(value) => setAssignmentToRemove(value)}
                  options={[
                    {value: "", label: t("chooseAssignment")},
                    ...allAssignments.map((assignment) => ({
                      value: assignment.id,
                      label: assignment.label,
                    })),
                  ]}
                />
                <Button
                  label={t("removeAssignmentSubmit")}
                  variant="secondary"
                  isDisabled={!assignmentToRemove}
                  isLoading={isRemovingAssignment}
                  onClick={removeAssignment}
                />
              </Stack>
            </Card>
          ) : null}
        </>
      ) : null}

      <AlertDialog
        isOpen={shiftToRemove !== null}
        onOpenChange={(open) => setShiftToRemove(open ? shiftToRemove : null)}
        title={t("removeShiftTitle")}
        description={t("removeShiftBody")}
        actionLabel={t("removeShiftConfirm")}
        cancelLabel={t("back")}
        isActionLoading={isRemovingShift}
        onAction={removeShift}
      />
    </Stack>
  );
}
