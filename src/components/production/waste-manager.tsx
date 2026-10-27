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
  archiveWasteAction,
  recordWasteAction,
} from "@/app/actions/production.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatBusinessDate, formatMoney, formatQuantity} from "@/lib/format";
import type {WasteOptions, WasteRecordSummary} from "@/lib/dto";
import {
  wasteSchema,
  type WasteValues,
} from "@/server/validators/production.schema";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function WasteManager({
  records,
  options,
  canWrite,
}: {
  records: WasteRecordSummary[];
  options: WasteOptions;
  canWrite: boolean;
}) {
  const t = useTranslations("Production.waste");
  const tValidation = useTranslations("Production.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const schema = useMemo(
    () => wasteSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<WasteValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      lotId: "",
      lossReasonId: "",
      quantity: "",
      reason: "",
      recordedAt: todayIso(),
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: WasteValues) {
    setError(null);
    const result = await recordWasteAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset({
      lotId: "",
      lossReasonId: "",
      quantity: "",
      reason: "",
      recordedAt: todayIso(),
    });
    router.refresh();
  }

  async function archive(record: WasteRecordSummary) {
    setError(null);
    setPendingId(record.id);

    try {
      const result = await archiveWasteAction({id: record.id});
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  const reasonLabel = (reason: {labelEn: string; labelFr: string}) =>
    locale === "fr" ? reason.labelFr : reason.labelEn;

  return (
    <Stack gap={6}>
      {canWrite ? (
        <Card padding={5}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack gap={4}>
              <Stack gap={1}>
                <Heading level={2}>{t("createTitle")}</Heading>
                <Text type="supporting">{t("createIntro")}</Text>
              </Stack>

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
                  name="lotId"
                  label={t("fields.lot")}
                  options={[
                    {value: "", label: t("chooseLot")},
                    ...options.lots.map((lot) => ({
                      value: lot.id,
                      label: `${lot.lotNumber} · ${lot.itemName} (${lot.quantityRemaining} ${lot.unitCode})`,
                    })),
                  ]}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="lossReasonId"
                  label={t("fields.reason")}
                  options={[
                    {value: "", label: t("chooseReason")},
                    ...options.lossReasons.map((reason) => ({
                      value: reason.id,
                      label: reasonLabel(reason),
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
                <FormDateInput
                  control={control}
                  name="recordedAt"
                  label={t("fields.recordedAt")}
                />
                <FormTextInput
                  control={control}
                  name="reason"
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

      <Stack gap={3}>
        <Heading level={2}>{t("listTitle")}</Heading>

        {error ? (
          <Banner status="error" title={t("errorTitle")} description={error} />
        ) : null}

        {records.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<WasteRecordSummary>
            data={records}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "date",
                header: t("columns.date"),
                width: pixel(140),
                renderCell: (record) =>
                  formatBusinessDate(record.recordedAt, {locale}),
              },
              {
                key: "item",
                header: t("columns.item"),
                width: proportional(3),
                renderCell: (record) => `${record.itemName} · ${record.lotNumber}`,
              },
              {
                key: "reason",
                header: t("columns.reason"),
                width: proportional(2),
                renderCell: (record) => record.reasonLabel,
              },
              {
                key: "quantity",
                header: t("columns.quantity"),
                width: pixel(120),
                align: "end",
                renderCell: (record) =>
                  `${formatQuantity(record.quantity, {locale})} ${record.unitCode}`,
              },
              {
                key: "cost",
                header: t("columns.cost"),
                width: pixel(120),
                align: "end",
                renderCell: (record) =>
                  formatMoney(record.costImpact, {
                    locale,
                    currency: record.currency,
                  }),
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(110),
                renderCell: (record) => (
                  <Badge
                    label={record.isArchived ? t("archived") : t("active")}
                    variant={record.isArchived ? "neutral" : "success"}
                  />
                ),
              },
              {
                key: "actions",
                header: "",
                width: pixel(120),
                renderCell: (record) =>
                  canWrite && !record.isArchived ? (
                    <HStack gap={2}>
                      <Button
                        label={t("archive")}
                        variant="ghost"
                        size="sm"
                        isLoading={pendingId === record.id}
                        onClick={() => archive(record)}
                      />
                    </HStack>
                  ) : null,
              },
            ]}
          />
        )}
      </Stack>
    </Stack>
  );
}
