"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Badge} from "@astryxdesign/core/Badge";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Dialog, DialogHeader} from "@astryxdesign/core/Dialog";
import {HStack} from "@astryxdesign/core/HStack";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {createRecipeAction} from "@/app/actions/recipe.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatMoney, formatPercent} from "@/lib/format";
import type {ItemOption, RecipeListRecord} from "@/lib/dto";
import {
  recipeInputSchema,
  type RecipeInputValues,
} from "@/server/validators/recipe.schema";

export function RecipeManager({
  recipes,
  outputItems,
  canWrite,
}: {
  recipes: RecipeListRecord[];
  outputItems: ItemOption[];
  canWrite: boolean;
}) {
  const t = useTranslations("Recipes");
  const tValidation = useTranslations("Recipes.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const schema = useMemo(
    () => recipeInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<RecipeInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      outputItemId: outputItems[0]?.id ?? "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: RecipeInputValues) {
    setError(null);
    const result = await createRecipeAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    setCreateOpen(false);
    if (result.recipeId && result.versionId) {
      router.push(
        `/dashboard/recipes/${result.recipeId}/versions/${result.versionId}`,
      );
      router.refresh();
      return;
    }

    reset();
    router.refresh();
  }

  return (
    <Stack gap={6}>
      {canWrite ? (
        <Dialog
          isOpen={createOpen}
          onOpenChange={setCreateOpen}
          width={520}
          purpose="form"
        >
          <DialogHeader
            title={t("createTitle")}
            subtitle={t("createIntro")}
            onOpenChange={setCreateOpen}
          />
          <Card padding={0}>
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
                <FormTextInput
                  control={control}
                  name="name"
                  label={t("fields.name")}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="code"
                  label={t("fields.code")}
                  description={t("fields.codeHint")}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="description"
                  label={t("fields.description")}
                />
                <FormSelector
                  control={control}
                  name="outputItemId"
                  label={t("fields.outputItem")}
                  options={outputItems.map((item) => ({
                    value: item.id,
                    label: `${item.code} · ${item.name}`,
                  }))}
                  isRequired
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
        </Dialog>
      ) : null}

      <Stack gap={3}>
        <HStack justify="between" align="end" wrap="wrap" gap={3}>
          <Heading level={2}>{t("listTitle")}</Heading>
          {canWrite ? (
            <Button
              variant="primary"
              label={t("createTitle")}
              onClick={() => setCreateOpen(true)}
            />
          ) : null}
        </HStack>

        {error ? (
          <Banner status="error" title={t("errorTitle")} description={error} />
        ) : null}

        {recipes.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<RecipeListRecord>
            data={recipes}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "name",
                header: t("columns.name"),
                width: proportional(3),
                renderCell: (recipe) => (
                  <Stack gap={0}>
                    <Text weight="semibold">{recipe.name}</Text>
                    <Text type="supporting" color="secondary">
                      {recipe.code} · {recipe.outputItemName}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: "version",
                header: t("columns.version"),
                width: pixel(100),
                renderCell: (recipe) =>
                  recipe.versionNumber ? `v${recipe.versionNumber}` : "—",
              },
              {
                key: "cost",
                header: t("columns.costPerUnit"),
                width: pixel(130),
                align: "end",
                renderCell: (recipe) =>
                  recipe.costPerUnit && recipe.currency
                    ? formatMoney(recipe.costPerUnit, {
                        locale,
                        currency: recipe.currency,
                      })
                    : "—",
              },
              {
                key: "margin",
                header: t("columns.margin"),
                width: pixel(100),
                align: "end",
                renderCell: (recipe) =>
                  recipe.marginPct
                    ? formatPercent(recipe.marginPct, {locale})
                    : "—",
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(120),
                renderCell: (recipe) => (
                  <Badge
                    label={
                      recipe.isArchived
                        ? t("archived")
                        : recipe.status
                          ? t(`statuses.${recipe.status}`)
                          : t("draftOnly")
                    }
                    variant={
                      recipe.status === "PUBLISHED"
                        ? "success"
                        : recipe.status === "DRAFT"
                          ? "warning"
                          : "neutral"
                    }
                  />
                ),
              },
              {
                key: "actions",
                header: "",
                width: pixel(110),
                renderCell: (recipe) => (
                  <Button
                    label={t("open")}
                    variant="ghost"
                    size="sm"
                    href={`/dashboard/recipes/${recipe.id}`}
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
