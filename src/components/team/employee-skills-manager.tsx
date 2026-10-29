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
  addEmployeeSkillAction,
  removeEmployeeSkillAction,
} from "@/app/actions/skill.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {formatBusinessDate} from "@/lib/format";
import type {EmployeeSkillRecord, SkillRecord} from "@/lib/dto";
import {
  employeeSkillInputSchema,
  SKILL_LEVELS,
  type EmployeeSkillInputValues,
} from "@/server/validators/skill.schema";

export function EmployeeSkillsManager({
  employeeId,
  skills,
  assigned,
  canWrite,
}: {
  employeeId: string;
  skills: SkillRecord[];
  assigned: EmployeeSkillRecord[];
  canWrite: boolean;
}) {
  const t = useTranslations("Skills.employee");
  const tValidation = useTranslations("Skills.validation");
  const tErrors = useTranslations("Settings.errors");
  const locale = useLocale();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => employeeSkillInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const available = skills.filter(
    (skill) =>
      !skill.archivedAt && !assigned.some((row) => row.skillId === skill.id),
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<EmployeeSkillInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      skillId: available[0]?.id ?? "",
      level: "INTERMEDIATE",
      certifiedOn: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: EmployeeSkillInputValues) {
    setError(null);
    const result = await addEmployeeSkillAction(employeeId, values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset({
      skillId: "",
      level: "INTERMEDIATE",
      certifiedOn: "",
    });
    router.refresh();
  }

  async function remove(row: EmployeeSkillRecord) {
    setError(null);
    setPendingId(row.id);

    try {
      const result = await removeEmployeeSkillAction({
        employeeId,
        id: row.id,
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
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading level={2}>{t("title")}</Heading>
        <Text type="supporting">{t("intro")}</Text>
      </Stack>

      {canWrite && available.length > 0 ? (
        <Card padding={5}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack gap={4}>
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
                  name="skillId"
                  label={t("fields.skill")}
                  options={available.map((skill) => ({
                    value: skill.id,
                    label: `${skill.name} (${skill.code})`,
                  }))}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="level"
                  label={t("fields.level")}
                  options={SKILL_LEVELS.map((level) => ({
                    value: level,
                    label: t(`levels.${level}`),
                  }))}
                />
                <FormDateInput
                  control={control}
                  name="certifiedOn"
                  label={t("fields.certifiedOn")}
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

      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      {assigned.length === 0 ? (
        <Card padding={4}>
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyBody")}
            isCompact
          />
        </Card>
      ) : (
        <Table<EmployeeSkillRecord>
          data={assigned}
          idKey="id"
          density="compact"
          columns={[
            {
              key: "skill",
              header: t("columns.skill"),
              width: proportional(3),
              renderCell: (row) => row.skillName,
            },
            {
              key: "level",
              header: t("columns.level"),
              width: proportional(2),
              renderCell: (row) => t(`levels.${row.level}`),
            },
            {
              key: "certifiedOn",
              header: t("columns.certifiedOn"),
              width: pixel(140),
              renderCell: (row) =>
                row.certifiedOn
                  ? formatBusinessDate(row.certifiedOn, {locale})
                  : "—",
            },
            {
              key: "actions",
              header: "",
              width: pixel(110),
              renderCell: (row) =>
                canWrite ? (
                  <HStack gap={2}>
                    <Button
                      label={t("remove")}
                      variant="ghost"
                      size="sm"
                      isLoading={pendingId === row.id}
                      onClick={() => remove(row)}
                    />
                  </HStack>
                ) : null,
            },
          ]}
        />
      )}
    </Stack>
  );
}
