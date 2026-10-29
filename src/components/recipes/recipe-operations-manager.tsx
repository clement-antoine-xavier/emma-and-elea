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
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  addRecipeOperationAction,
  removeRecipeOperationAction,
} from "@/app/actions/recipe.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import type {RecipeOperationRecord, RecipeOptions} from "@/lib/dto";
import {
  recipeOperationInputSchema,
  type RecipeOperationInputValues,
} from "@/server/validators/recipe.schema";

export function RecipeOperationsManager({
  versionId,
  operations,
  equipment,
  labourRates,
  skills,
  canWrite,
}: {
  versionId: string;
  operations: RecipeOperationRecord[];
  equipment: RecipeOptions["equipment"];
  labourRates: RecipeOptions["labourRates"];
  skills: RecipeOptions["skills"];
  canWrite: boolean;
}) {
  const t = useTranslations("Recipes.operations");
  const tValidation = useTranslations("Recipes.validation");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const schema = useMemo(
    () => recipeOperationInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<RecipeOperationInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      durationMinutes: "",
      activeMinutes: "",
      equipmentId: "",
      labourRateId: "",
      requiredSkillId: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function add(values: RecipeOperationInputValues) {
    setError(null);
    const result = await addRecipeOperationAction(versionId, values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset();
    router.refresh();
  }

  async function remove(operation: RecipeOperationRecord) {
    setError(null);
    setPendingId(operation.id);

    try {
      const result = await removeRecipeOperationAction({
        versionId,
        operationId: operation.id,
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

      {canWrite ? (
        <Card padding={5}>
          <form onSubmit={handleSubmit(add)} noValidate>
            <Stack gap={4}>
              {errors.root?.message ? (
                <Banner
                  status="error"
                  title={t("errorTitle")}
                  description={errors.root.message}
                />
              ) : null}

              <FormLayout>
                <FormTextInput
                  control={control}
                  name="name"
                  label={t("fields.name")}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="durationMinutes"
                  label={t("fields.durationMinutes")}
                  description={t("fields.durationHint")}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="activeMinutes"
                  label={t("fields.activeMinutes")}
                  description={t("fields.activeHint")}
                />
                <FormSelector
                  control={control}
                  name="equipmentId"
                  label={t("fields.equipment")}
                  options={[
                    {value: "", label: t("noEquipment")},
                    ...equipment.map((item) => ({
                      value: item.id,
                      label: item.siteName
                        ? `${item.name} · ${item.siteName}`
                        : item.name,
                    })),
                  ]}
                />
                <FormSelector
                  control={control}
                  name="labourRateId"
                  label={t("fields.labourRate")}
                  options={[
                    {value: "", label: t("defaultRate")},
                    ...labourRates.map((rate) => ({
                      value: rate.id,
                      label: `${rate.label} · ${rate.hourlyCost} ${rate.currency}/h`,
                    })),
                  ]}
                />
                <FormSelector
                  control={control}
                  name="requiredSkillId"
                  label={t("fields.requiredSkill")}
                  options={[
                    {value: "", label: t("noSkill")},
                    ...skills.map((skill) => ({
                      value: skill.id,
                      label: `${skill.name} (${skill.code})`,
                    })),
                  ]}
                />
                <FormTextInput
                  control={control}
                  name="description"
                  label={t("fields.description")}
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

      {operations.length === 0 ? (
        <Card padding={4}>
          <EmptyState title={t("emptyTitle")} description={t("emptyBody")} isCompact />
        </Card>
      ) : (
        <Table<RecipeOperationRecord>
          data={operations}
          idKey="id"
          density="compact"
          columns={[
            {
              key: "name",
              header: t("columns.name"),
              width: proportional(3),
              renderCell: (operation) => operation.name,
            },
            {
              key: "minutes",
              header: t("columns.minutes"),
              width: pixel(150),
              renderCell: (operation) =>
                operation.activeMinutes === null
                  ? `${operation.durationMinutes} min`
                  : `${operation.durationMinutes} min · ${operation.activeMinutes} active`,
            },
            {
              key: "equipment",
              header: t("columns.equipment"),
              width: proportional(2),
              renderCell: (operation) => operation.equipmentName ?? "—",
            },
            {
              key: "rate",
              header: t("columns.rate"),
              width: proportional(2),
              renderCell: (operation) => operation.labourRateLabel ?? "—",
            },
            {
              key: "actions",
              header: "",
              width: pixel(110),
              renderCell: (operation) =>
                canWrite ? (
                  <HStack gap={2}>
                    <Button
                      label={t("remove")}
                      variant="ghost"
                      size="sm"
                      isLoading={pendingId === operation.id}
                      onClick={() => remove(operation)}
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
