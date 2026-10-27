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
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  createAbsenceAction,
  decideAbsenceAction,
} from "@/app/actions/schedule.actions";
import {FormDateTimeInput} from "@/components/form-date-time-input";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatDateTime} from "@/lib/format";
import type {AbsenceRecord, EmployeeOption} from "@/lib/dto";
import {
  ABSENCE_KINDS,
  absenceInputSchema,
  type AbsenceInputValues,
} from "@/server/validators/schedule.schema";

export function AbsenceManager({
  absences,
  employees,
  canRequest,
  canDecide,
  currentEmployee,
}: {
  absences: AbsenceRecord[];
  employees: EmployeeOption[];
  canRequest: boolean;
  canDecide: boolean;
  currentEmployee: EmployeeOption | null;
}) {
  const t = useTranslations("Team.absences");
  const tKinds = useTranslations("Team.absenceKinds");
  const tStatuses = useTranslations("Team.absenceStatuses");
  const tValidation = useTranslations("Team.schedule.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const schema = useMemo(
    () => absenceInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<AbsenceInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: currentEmployee?.id ?? employees[0]?.id ?? "",
      kind: "VACATION",
      startsAt: "",
      endsAt: "",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: AbsenceInputValues) {
    setError(null);
    const result = await createAbsenceAction(values);
    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }
    reset({
      employeeId: values.employeeId,
      kind: values.kind,
      startsAt: "",
      endsAt: "",
      note: "",
    });
    router.refresh();
  }

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    setPendingId(id);
    try {
      const result = await decideAbsenceAction(id, status);
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Stack gap={6}>
      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      <Stack gap={3}>
        <Heading level={2}>{t("title")}</Heading>
        <Text type="supporting">{t("intro")}</Text>

        {absences.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<AbsenceRecord>
            data={absences}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "employee",
                header: t("columns.employee"),
                width: proportional(2),
                renderCell: (absence) => absence.employeeName,
              },
              {
                key: "kind",
                header: t("columns.kind"),
                width: pixel(120),
                renderCell: (absence) => tKinds(absence.kind),
              },
              {
                key: "period",
                header: t("columns.period"),
                width: proportional(3),
                renderCell: (absence) =>
                  `${formatDateTime(absence.startsAt, {
                    locale,
                    timeZone: absence.timeZone,
                  })} → ${formatDateTime(absence.endsAt, {
                    locale,
                    timeZone: absence.timeZone,
                  })}`,
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(120),
                renderCell: (absence) => (
                  <Badge
                    label={tStatuses(absence.status)}
                    variant={
                      absence.status === "APPROVED"
                        ? "success"
                        : absence.status === "REJECTED"
                          ? "neutral"
                          : "warning"
                    }
                  />
                ),
              },
              {
                key: "note",
                header: t("columns.note"),
                width: proportional(2),
                renderCell: (absence) => absence.note ?? "—",
              },
              {
                key: "actions",
                header: "",
                width: pixel(190),
                renderCell: (absence) =>
                  canDecide && absence.status === "REQUESTED" ? (
                    <HStack gap={2} wrap="wrap">
                      <Button
                        label={t("approve")}
                        variant="ghost"
                        size="sm"
                        isLoading={pendingId === absence.id}
                        onClick={() => decide(absence.id, "APPROVED")}
                      />
                      <Button
                        label={t("reject")}
                        variant="ghost"
                        size="sm"
                        isLoading={pendingId === absence.id}
                        onClick={() => decide(absence.id, "REJECTED")}
                      />
                    </HStack>
                  ) : null,
              },
            ]}
          />
        )}
      </Stack>

      {canRequest && employees.length > 0 ? (
        <Card padding={5}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack gap={4}>
              <Stack gap={1}>
                <Heading level={2}>{t("addTitle")}</Heading>
                <Text type="supporting">{t("addIntro")}</Text>
              </Stack>

              {errors.root?.message ? (
                <Banner
                  status="error"
                  title={t("addErrorTitle")}
                  description={errors.root.message}
                />
              ) : null}

              <FormLayout>
                <FormSelector
                  control={control}
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
                <FormSelector
                  control={control}
                  name="kind"
                  label={t("fields.kind")}
                  options={ABSENCE_KINDS.map((kind) => ({
                    value: kind,
                    label: tKinds(kind),
                  }))}
                />
                <FormDateTimeInput
                  control={control}
                  name="startsAt"
                  label={t("fields.startsAt")}
                  isRequired
                />
                <FormDateTimeInput
                  control={control}
                  name="endsAt"
                  label={t("fields.endsAt")}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="note"
                  label={t("fields.note")}
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

      {canRequest && employees.length === 0 ? (
        <Banner
          status="info"
          title={t("noEmployeeTitle")}
          description={t("noEmployeeBody")}
        />
      ) : null}
    </Stack>
  );
}
