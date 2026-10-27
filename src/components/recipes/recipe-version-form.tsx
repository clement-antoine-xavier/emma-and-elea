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
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {updateRecipeVersionAction} from "@/app/actions/recipe.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextArea} from "@/components/form-text-area";
import {FormTextInput} from "@/components/form-text-input";
import type {RecipeVersionDetailRecord, UnitOption} from "@/lib/dto";
import {
  recipeVersionInputSchema,
  type RecipeVersionInputValues,
} from "@/server/validators/recipe.schema";

export function RecipeVersionForm({
  version,
  units,
}: {
  version: RecipeVersionDetailRecord;
  units: UnitOption[];
}) {
  const t = useTranslations("Recipes.versionForm");
  const tValidation = useTranslations("Recipes.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const schema = useMemo(
    () => recipeVersionInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError,
    formState: {errors, isSubmitting},
  } = useForm<RecipeVersionInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      yieldQuantity: version.yieldQuantity,
      yieldUnitId: version.yieldUnitId,
      portionCount:
        version.portionCount === null ? "" : String(version.portionCount),
      prepMinutes:
        version.prepMinutes === null ? "" : String(version.prepMinutes),
      cookMinutes:
        version.cookMinutes === null ? "" : String(version.cookMinutes),
      instructions: version.instructions ?? "",
      changeNote: version.changeNote ?? "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: RecipeVersionInputValues) {
    setSaved(false);
    const result = await updateRecipeVersionAction(version.id, values);

    if (!result.ok) {
      setError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    setSaved(true);
    router.refresh();
  }

  const unitLabel = (unit: UnitOption) =>
    `${unit.code} · ${locale === "fr" ? unit.labelFr : unit.labelEn}`;

  return (
    <Card padding={5}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap={4}>
          <Stack gap={1}>
            <Heading level={2}>{t("title")}</Heading>
            <Text type="supporting">{t("intro")}</Text>
          </Stack>

          {saved ? <Banner status="success" title={t("saved")} /> : null}

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
              name="yieldQuantity"
              label={t("fields.yieldQuantity")}
              isRequired
            />
            <FormSelector
              control={control}
              name="yieldUnitId"
              label={t("fields.yieldUnit")}
              options={units.map((unit) => ({
                value: unit.id,
                label: unitLabel(unit),
              }))}
              isRequired
            />
            <FormTextInput
              control={control}
              name="portionCount"
              label={t("fields.portionCount")}
            />
            <FormTextInput
              control={control}
              name="prepMinutes"
              label={t("fields.prepMinutes")}
            />
            <FormTextInput
              control={control}
              name="cookMinutes"
              label={t("fields.cookMinutes")}
            />
            <FormTextArea
              control={control}
              name="instructions"
              label={t("fields.instructions")}
            />
            <FormTextInput
              control={control}
              name="changeNote"
              label={t("fields.changeNote")}
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
  );
}
