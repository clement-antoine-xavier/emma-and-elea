"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {updateEmployeeAction} from "@/app/actions/schedule.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormSwitch} from "@/components/form-switch";
import {FormTextInput} from "@/components/form-text-input";
import type {EmployeeProfileRecord} from "@/lib/dto";
import {
  employeeInputSchema,
  type EmployeeInputValues,
} from "@/server/validators/schedule.schema";

export function EmployeeEditForm({
  employee,
  sites,
  canWrite,
}: {
  employee: EmployeeProfileRecord;
  sites: {id: string; name: string; code: string}[];
  canWrite: boolean;
}) {
  const t = useTranslations("Team.employees");
  const tValidation = useTranslations("Team.schedule.validation");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const schema = useMemo(
    () => employeeInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<EmployeeInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      memberId: employee.memberId,
      jobTitle: employee.jobTitle ?? "",
      siteId: employee.siteId ?? "",
      weeklyContractHours: employee.weeklyContractHours ?? "",
      hiredOn: employee.hiredOn
        ? employee.hiredOn.toISOString().slice(0, 10)
        : "",
      isActive: employee.isActive,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: EmployeeInputValues) {
    setError(null);
    setSaved(false);
    const result = await updateEmployeeAction(employee.id, values);
    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }
    setSaved(true);
    router.refresh();
  }

  if (!canWrite) return null;

  return (
    <Card padding={5}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap={4}>
          <Stack gap={1}>
            <Heading level={2}>{t("editTitle")}</Heading>
            <Text type="supporting">{t("editIntro")}</Text>
          </Stack>

          {saved ? (
            <Banner
              status="success"
              title={t("savedTitle")}
              description={t("savedBody")}
            />
          ) : null}
          {errors.root?.message || error ? (
            <Banner
              status="error"
              title={t("errorTitle")}
              description={errors.root?.message ?? error ?? ""}
            />
          ) : null}

          <FormLayout>
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
            label={t("save")}
            isLoading={isSubmitting}
          />
        </Stack>
      </form>
    </Card>
  );
}
