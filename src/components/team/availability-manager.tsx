"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
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
  addAvailabilityAction,
  removeAvailabilityAction,
} from "@/app/actions/schedule.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormTimeInput} from "@/components/form-time-input";
import {
  formatBusinessDate,
  formatMinutes,
} from "@/lib/format";
import type {EmployeeAvailabilityRecord} from "@/lib/dto";
import {
  WEEKDAYS,
  availabilityInputSchema,
  type AvailabilityInputValues,
} from "@/server/validators/schedule.schema";

type WeekdayKey = "0" | "1" | "2" | "3" | "4" | "5" | "6";

function weekdayKey(value: number): WeekdayKey {
  return String(value) as WeekdayKey;
}

export function AvailabilityManager({
  employeeId,
  availability,
  canWrite,
}: {
  employeeId: string;
  availability: EmployeeAvailabilityRecord[];
  canWrite: boolean;
}) {
  const t = useTranslations("Team.availability");
  const tWeekdays = useTranslations("Team.weekdays");
  const tValidation = useTranslations("Team.schedule.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const schema = useMemo(
    () => availabilityInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<AvailabilityInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId,
      weekday: "0",
      startTime: "08:00",
      endTime: "16:00",
      validFrom: "",
      validTo: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: AvailabilityInputValues) {
    setError(null);
    const result = await addAvailabilityAction(employeeId, values);
    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }
    reset({
      employeeId,
      weekday: values.weekday,
      startTime: values.startTime,
      endTime: values.endTime,
      validFrom: "",
      validTo: "",
    });
    router.refresh();
  }

  async function remove(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const result = await removeAvailabilityAction({
        employeeId,
        availabilityId: id,
      });
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
      <Stack gap={3}>
        <Heading level={2}>{t("title")}</Heading>
        <Text type="supporting">{t("intro")}</Text>
        {error ? (
          <Banner status="error" title={t("errorTitle")} description={error} />
        ) : null}

        {availability.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<EmployeeAvailabilityRecord>
            data={availability}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "weekday",
                header: t("columns.weekday"),
                width: proportional(2),
                renderCell: (window) =>
                  tWeekdays(weekdayKey(window.weekday)),
              },
              {
                key: "hours",
                header: t("columns.hours"),
                width: proportional(2),
                renderCell: (window) =>
                  `${formatMinutes(window.startMinute)} – ${formatMinutes(window.endMinute)}`,
              },
              {
                key: "validity",
                header: t("columns.validity"),
                width: proportional(2),
                renderCell: (window) =>
                  window.validFrom || window.validTo
                    ? `${window.validFrom ? formatBusinessDate(window.validFrom, {locale}) : "…"} → ${
                        window.validTo
                          ? formatBusinessDate(window.validTo, {locale})
                          : "…"
                      }`
                    : t("always"),
              },
              {
                key: "actions",
                header: "",
                width: pixel(100),
                renderCell: (window) =>
                  canWrite ? (
                    <HStack gap={2}>
                      <Button
                        label={t("remove")}
                        variant="ghost"
                        size="sm"
                        isLoading={pendingId === window.id}
                        onClick={() => remove(window.id)}
                      />
                    </HStack>
                  ) : null,
              },
            ]}
          />
        )}
      </Stack>

      {canWrite ? (
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
                  name="weekday"
                  label={t("fields.weekday")}
                  options={WEEKDAYS.map((weekday) => ({
                    value: String(weekday),
                    label: tWeekdays(weekdayKey(weekday)),
                  }))}
                />
                <FormTimeInput
                  control={control}
                  name="startTime"
                  label={t("fields.startTime")}
                  isRequired
                />
                <FormTimeInput
                  control={control}
                  name="endTime"
                  label={t("fields.endTime")}
                  isRequired
                />
                <FormDateInput
                  control={control}
                  name="validFrom"
                  label={t("fields.validFrom")}
                />
                <FormDateInput
                  control={control}
                  name="validTo"
                  label={t("fields.validTo")}
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
    </Stack>
  );
}
