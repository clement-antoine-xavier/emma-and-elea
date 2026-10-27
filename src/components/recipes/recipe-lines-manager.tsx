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
  addRecipeLineAction,
  removeRecipeLineAction,
} from "@/app/actions/recipe.actions";
import {FormSelector} from "@/components/form-selector";
import {FormSwitch} from "@/components/form-switch";
import {FormTextInput} from "@/components/form-text-input";
import {formatQuantity} from "@/lib/format";
import type {ItemOption, RecipeLineRecord, UnitOption} from "@/lib/dto";
import {
  recipeLineInputSchema,
  type RecipeLineInputValues,
} from "@/server/validators/recipe.schema";

export function RecipeLinesManager({
  versionId,
  lines,
  items,
  units,
  canWrite,
}: {
  versionId: string;
  lines: RecipeLineRecord[];
  items: ItemOption[];
  units: UnitOption[];
  canWrite: boolean;
}) {
  const t = useTranslations("Recipes.lines");
  const tValidation = useTranslations("Recipes.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const schema = useMemo(
    () => recipeLineInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<RecipeLineInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemId: "",
      quantity: "",
      unitId: "",
      lossPct: "0",
      isOptional: false,
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function add(values: RecipeLineInputValues) {
    setError(null);
    const result = await addRecipeLineAction(versionId, values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset();
    router.refresh();
  }

  async function remove(line: RecipeLineRecord) {
    setError(null);
    setPendingId(line.id);

    try {
      const result = await removeRecipeLineAction({
        versionId,
        lineId: line.id,
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

  const unitLabel = (unit: UnitOption) =>
    `${unit.code} · ${locale === "fr" ? unit.labelFr : unit.labelEn}`;

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
                <FormSelector
                  control={control}
                  name="itemId"
                  label={t("fields.item")}
                  options={[
                    {value: "", label: t("chooseItem")},
                    ...items.map((item) => ({
                      value: item.id,
                      label: `${item.code} · ${item.name}`,
                    })),
                  ]}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="quantity"
                  label={t("fields.quantity")}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="unitId"
                  label={t("fields.unit")}
                  options={[
                    {value: "", label: t("chooseUnit")},
                    ...units.map((unit) => ({
                      value: unit.id,
                      label: unitLabel(unit),
                    })),
                  ]}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="lossPct"
                  label={t("fields.lossPct")}
                  description={t("fields.lossPctHint")}
                />
                <FormSwitch
                  control={control}
                  name="isOptional"
                  label={t("fields.isOptional")}
                  description={t("fields.isOptionalHint")}
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

      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      {lines.length === 0 ? (
        <Card padding={4}>
          <EmptyState title={t("emptyTitle")} description={t("emptyBody")} isCompact />
        </Card>
      ) : (
        <Table<RecipeLineRecord>
          data={lines}
          idKey="id"
          density="compact"
          columns={[
            {
              key: "item",
              header: t("columns.item"),
              width: proportional(3),
              renderCell: (line) => (
                <Stack gap={0}>
                  <Text weight="semibold">{line.itemName}</Text>
                  <Text type="supporting" color="secondary">
                    {line.itemCode}
                    {line.isOptional ? ` · ${t("optional")}` : ""}
                  </Text>
                </Stack>
              ),
            },
            {
              key: "quantity",
              header: t("columns.quantity"),
              width: pixel(120),
              align: "end",
              renderCell: (line) =>
                `${formatQuantity(line.quantity, {locale})} ${line.unitCode}`,
            },
            {
              key: "loss",
              header: t("columns.loss"),
              width: pixel(90),
              align: "end",
              renderCell: (line) => `${line.lossPct}%`,
            },
            {
              key: "lost",
              header: t("columns.optional"),
              width: pixel(110),
              renderCell: (line) =>
                line.isOptional ? (
                  <Badge label={t("optional")} variant="neutral" />
                ) : (
                  "—"
                ),
            },
            {
              key: "actions",
              header: "",
              width: pixel(110),
              renderCell: (line) =>
                canWrite ? (
                  <HStack gap={2}>
                    <Button
                      label={t("remove")}
                      variant="ghost"
                      size="sm"
                      isLoading={pendingId === line.id}
                      onClick={() => remove(line)}
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
