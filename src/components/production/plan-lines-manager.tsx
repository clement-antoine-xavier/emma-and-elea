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
  addPlanLineAction,
  createBatchFromPlanLineAction,
  removePlanLineAction,
  updatePlanLineAction,
} from "@/app/actions/planning.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatQuantity} from "@/lib/format";
import type {
  ProductionPlanDetailRecord,
  ProductionPlanLineRecord,
} from "@/lib/dto";
import {
  planLineInputSchema,
  planLineUpdateSchema,
  type PlanLineInputValues,
  type PlanLineUpdateValues,
} from "@/server/validators/planning.schema";

export function PlanLinesManager({
  plan,
  items,
  canWrite,
}: {
  plan: ProductionPlanDetailRecord;
  items: {
    itemId: string;
    itemCode: string;
    itemName: string;
    recipeId: string;
    recipeName: string;
    stockUnitId: string;
    stockUnitCode: string;
  }[];
  canWrite: boolean;
}) {
  const t = useTranslations("Production.planning.lines");
  const tValidation = useTranslations("Production.planning.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingLineId, setPendingLineId] = useState<string | null>(null);

  const isDraft = plan.status === "DRAFT";
  const isConfirmed = plan.status === "CONFIRMED";
  const canEdit = canWrite && isDraft;

  const addSchema = useMemo(
    () => planLineInputSchema((key) => tValidation(key)),
    [tValidation],
  );
  const updateSchema = useMemo(
    () => planLineUpdateSchema((key) => tValidation(key)),
    [tValidation],
  );

  const addForm = useForm<PlanLineInputValues>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      itemId: items[0]?.itemId ?? "",
      quantity: "",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  const updateForm = useForm<PlanLineUpdateValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {lineId: "", quantity: ""},
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function addLine(values: PlanLineInputValues) {
    setError(null);
    const result = await addPlanLineAction(plan.id, values);
    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }
    addForm.reset({
      itemId: values.itemId,
      quantity: "",
      note: "",
    });
    router.refresh();
  }

  async function updateLine(values: PlanLineUpdateValues) {
    setError(null);
    const result = await updatePlanLineAction(plan.id, values);
    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }
    updateForm.reset({lineId: "", quantity: ""});
    router.refresh();
  }

  function adjust(line: ProductionPlanLineRecord) {
    setError(null);
    updateForm.setValue("lineId", line.id);
    updateForm.setValue("quantity", line.plannedQuantity);
  }

  async function removeLine(lineId: string) {
    setError(null);
    setPendingLineId(lineId);
    try {
      const result = await removePlanLineAction({
        planId: plan.id,
        lineId,
      });
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingLineId(null);
    }
  }

  async function createBatch(lineId: string) {
    setError(null);
    setPendingLineId(lineId);
    try {
      const result = await createBatchFromPlanLineAction({lineId});
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      if (result.batchId) {
        router.push(`/dashboard/production/batches/${result.batchId}`);
        router.refresh();
      }
    } finally {
      setPendingLineId(null);
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

        {plan.lines.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<ProductionPlanLineRecord>
            data={plan.lines}
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
                    </Text>
                  </Stack>
                ),
              },
              {
                key: "recipe",
                header: t("columns.recipe"),
                width: proportional(2),
                renderCell: (line) => line.recipeName ?? t("noRecipe"),
              },
              {
                key: "source",
                header: t("columns.source"),
                width: proportional(2),
                renderCell: (line) =>
                  line.orderNumber
                    ? `${line.orderNumber} · ${line.customerName ?? ""}`
                    : t("forecastOrManual"),
              },
              {
                key: "quantity",
                header: t("columns.quantity"),
                width: pixel(130),
                align: "end",
                renderCell: (line) =>
                  `${formatQuantity(line.plannedQuantity, {locale})} ${line.unitCode}`,
              },
              {
                key: "batch",
                header: t("columns.batch"),
                width: pixel(150),
                renderCell: (line) =>
                  line.batchId && line.batchCode ? (
                    <Button
                      label={line.batchCode}
                      variant="ghost"
                      size="sm"
                      href={`/dashboard/production/batches/${line.batchId}`}
                    />
                  ) : (
                    "—"
                  ),
              },
              {
                key: "actions",
                header: "",
                width: pixel(220),
                renderCell: (line) => (
                  <HStack gap={2} wrap="wrap">
                    {canEdit ? (
                      <>
                        <Button
                          label={t("adjust")}
                          variant="ghost"
                          size="sm"
                          onClick={() => adjust(line)}
                        />
                        <Button
                          label={t("remove")}
                          variant="ghost"
                          size="sm"
                          isLoading={pendingLineId === line.id}
                          onClick={() => removeLine(line.id)}
                        />
                      </>
                    ) : null}
                    {isConfirmed && canWrite && line.recipeId && !line.batchId ? (
                      <Button
                        label={t("createBatch")}
                        variant="secondary"
                        size="sm"
                        isLoading={pendingLineId === line.id}
                        onClick={() => createBatch(line.id)}
                      />
                    ) : null}
                  </HStack>
                ),
              },
            ]}
          />
        )}
      </Stack>

      {canEdit ? (
        <>
          {plan.lines.length > 0 ? (
          <Card padding={5}>
            <form onSubmit={updateForm.handleSubmit(updateLine)} noValidate>
              <Stack gap={4}>
                <Stack gap={1}>
                  <Heading level={2}>{t("updateTitle")}</Heading>
                  <Text type="supporting">{t("updateIntro")}</Text>
                </Stack>

                <FormLayout>
                  <FormSelector
                    control={updateForm.control}
                    name="lineId"
                    label={t("fields.line")}
                    options={[
                      {value: "", label: t("chooseLine")},
                      ...plan.lines.map((line) => ({
                        value: line.id,
                        label: `${line.itemName} · ${formatQuantity(line.plannedQuantity, {locale})} ${line.unitCode}${
                          line.orderNumber ? ` · ${line.orderNumber}` : ""
                        }`,
                      })),
                    ]}
                    isRequired
                  />
                  <FormTextInput
                    control={updateForm.control}
                    name="quantity"
                    label={t("fields.quantity")}
                    isRequired
                  />
                </FormLayout>

                <Button
                  type="submit"
                  variant="secondary"
                  label={t("updateSubmit")}
                  isLoading={updateForm.formState.isSubmitting}
                />
              </Stack>
            </form>
          </Card>
          ) : null}

          {items.length > 0 ? (
          <Card padding={5}>
            <form onSubmit={addForm.handleSubmit(addLine)} noValidate>
              <Stack gap={4}>
                <Stack gap={1}>
                  <Heading level={2}>{t("addTitle")}</Heading>
                  <Text type="supporting">{t("addIntro")}</Text>
                </Stack>

                <FormLayout>
                  <FormSelector
                    control={addForm.control}
                    name="itemId"
                    label={t("fields.item")}
                    options={items.map((item) => ({
                      value: item.itemId,
                      label: `${item.itemCode} · ${item.itemName}`,
                    }))}
                    isRequired
                  />
                  <FormTextInput
                    control={addForm.control}
                    name="quantity"
                    label={t("fields.quantity")}
                    isRequired
                  />
                  <FormTextInput
                    control={addForm.control}
                    name="note"
                    label={t("fields.note")}
                  />
                </FormLayout>

                <Button
                  type="submit"
                  variant="primary"
                  label={t("addSubmit")}
                  isLoading={addForm.formState.isSubmitting}
                />
              </Stack>
            </form>
          </Card>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
