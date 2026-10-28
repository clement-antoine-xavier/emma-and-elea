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
import {createProductionBatchAction} from "@/app/actions/production.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatBusinessDate, formatQuantity} from "@/lib/format";
import type {
  ProductionBatchSummaryRecord,
  ProductionOptions,
} from "@/lib/dto";
import {
  productionBatchSchema,
  type ProductionBatchValues,
} from "@/server/validators/production.schema";

export function ProductionManager({
  batches,
  options,
  canWrite,
}: {
  batches: ProductionBatchSummaryRecord[];
  options: ProductionOptions;
  canWrite: boolean;
}) {
  const t = useTranslations("Production");
  const tValidation = useTranslations("Production.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const schema = useMemo(
    () => productionBatchSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<ProductionBatchValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      siteId: options.sites[0]?.id ?? "",
      recipeVersionId: options.recipes[0]?.recipeVersionId ?? "",
      plannedQuantity: "",
      plannedStartAt: "",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: ProductionBatchValues) {
    setError(null);
    const result = await createProductionBatchAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    setCreateOpen(false);
    if (result.batchId) {
      router.push(`/dashboard/production/batches/${result.batchId}`);
      router.refresh();
      return;
    }

    reset();
    router.refresh();
  }

  return (
    <Stack gap={6}>
      {canWrite && options.recipes.length > 0 ? (
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
                <FormSelector
                  control={control}
                  name="recipeVersionId"
                  label={t("fields.recipe")}
                  options={options.recipes.map((recipe) => ({
                    value: recipe.recipeVersionId,
                    label: `${recipe.name} · v${recipe.versionNumber} · ${recipe.outputItemName}`,
                  }))}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="siteId"
                  label={t("fields.site")}
                  options={options.sites.map((site) => ({
                    value: site.id,
                    label: `${site.code} · ${site.name}`,
                  }))}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="plannedQuantity"
                  label={t("fields.plannedQuantity")}
                  isRequired
                />
                <FormDateInput
                  control={control}
                  name="plannedStartAt"
                  label={t("fields.plannedStartAt")}
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
        </Dialog>
      ) : null}

      {canWrite && options.recipes.length === 0 ? (
        <Banner
          status="info"
          title={t("noRecipeTitle")}
          description={t("noRecipeBody")}
        />
      ) : null}

      <Stack gap={3}>
        <HStack justify="between" align="end" wrap="wrap" gap={3}>
          <Heading level={2}>{t("listTitle")}</Heading>
          {canWrite && options.recipes.length > 0 ? (
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

        {batches.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<ProductionBatchSummaryRecord>
            data={batches}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "code",
                header: t("columns.code"),
                width: pixel(140),
                renderCell: (batch) => batch.code,
              },
              {
                key: "recipe",
                header: t("columns.recipe"),
                width: proportional(3),
                renderCell: (batch) => (
                  <Stack gap={0}>
                    <Text weight="semibold">{batch.recipeName}</Text>
                    <Text type="supporting" color="secondary">
                      v{batch.versionNumber} · {batch.siteName}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(130),
                renderCell: (batch) => (
                  <Badge
                    label={t(`statuses.${batch.status}`)}
                    variant={
                      batch.status === "COMPLETED"
                        ? "success"
                        : batch.status === "CANCELLED"
                          ? "neutral"
                          : batch.status === "IN_PROGRESS"
                            ? "warning"
                            : "neutral"
                    }
                  />
                ),
              },
              {
                key: "planned",
                header: t("columns.planned"),
                width: pixel(120),
                align: "end",
                renderCell: (batch) =>
                  `${formatQuantity(batch.plannedQuantity, {locale})} ${batch.unitCode}`,
              },
              {
                key: "actual",
                header: t("columns.actual"),
                width: pixel(120),
                align: "end",
                renderCell: (batch) =>
                  batch.actualQuantity
                    ? `${formatQuantity(batch.actualQuantity, {locale})} ${batch.unitCode}`
                    : "—",
              },
              {
                key: "producedOn",
                header: t("columns.producedOn"),
                width: pixel(140),
                renderCell: (batch) =>
                  batch.producedOn
                    ? formatBusinessDate(batch.producedOn, {locale})
                    : "—",
              },
              {
                key: "actions",
                header: "",
                width: pixel(100),
                renderCell: (batch) => (
                  <Button
                    label={t("open")}
                    variant="ghost"
                    size="sm"
                    href={`/dashboard/production/batches/${batch.id}`}
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
