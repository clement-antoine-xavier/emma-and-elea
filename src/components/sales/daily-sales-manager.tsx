"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {recordDailySalesAction} from "@/app/actions/sales.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatBusinessDate, formatMoney, formatQuantity} from "@/lib/format";
import type {DailySalesRecord} from "@/lib/dto";
import {
  SALES_CHANNELS,
  dailySalesInputSchema,
  type DailySalesInputValues,
} from "@/server/validators/sales.schema";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DailySalesManager({
  rows,
  sites,
  items,
  canWrite,
}: {
  rows: DailySalesRecord[];
  sites: {id: string; name: string; code: string}[];
  items: {id: string; code: string; name: string}[];
  canWrite: boolean;
}) {
  const t = useTranslations("Sales.daily");
  const tChannels = useTranslations("Sales.channels");
  const tValidation = useTranslations("Sales.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => dailySalesInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<DailySalesInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      siteId: sites[0]?.id ?? "",
      itemId: "",
      businessDate: todayIso(),
      channel: "RETAIL",
      quantitySold: "",
      revenue: "",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: DailySalesInputValues) {
    setError(null);
    const result = await recordDailySalesAction(values);
    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }
    reset({
      siteId: values.siteId,
      itemId: "",
      businessDate: values.businessDate,
      channel: values.channel,
      quantitySold: "",
      revenue: "",
      note: "",
    });
    router.refresh();
  }

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
                  name="siteId"
                  label={t("fields.site")}
                  options={sites.map((site) => ({
                    value: site.id,
                    label: `${site.code} · ${site.name}`,
                  }))}
                  isRequired
                />
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
                <FormDateInput
                  control={control}
                  name="businessDate"
                  label={t("fields.businessDate")}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="channel"
                  label={t("fields.channel")}
                  options={SALES_CHANNELS.map((channel) => ({
                    value: channel,
                    label: tChannels(channel),
                  }))}
                />
                <FormTextInput
                  control={control}
                  name="quantitySold"
                  label={t("fields.quantitySold")}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="revenue"
                  label={t("fields.revenue")}
                  isRequired
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

      <Stack gap={3}>
        <Heading level={2}>{t("listTitle")}</Heading>
        {error ? (
          <Banner status="error" title={t("errorTitle")} description={error} />
        ) : null}

        {rows.length === 0 ? (
          <Card padding={4}>
            <EmptyState title={t("emptyTitle")} description={t("emptyBody")} isCompact />
          </Card>
        ) : (
          <Table<DailySalesRecord>
            data={rows}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "date",
                header: t("columns.date"),
                width: pixel(140),
                renderCell: (row) =>
                  formatBusinessDate(row.businessDate, {locale}),
              },
              {
                key: "item",
                header: t("columns.item"),
                width: proportional(3),
                renderCell: (row) => (
                  <Stack gap={0}>
                    <Text weight="semibold">{row.itemName}</Text>
                    <Text type="supporting" color="secondary">
                      {row.siteName}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: "quantity",
                header: t("columns.quantity"),
                width: pixel(120),
                align: "end",
                renderCell: (row) =>
                  `${formatQuantity(row.quantitySold, {locale})} ${row.unitCode}`,
              },
              {
                key: "revenue",
                header: t("columns.revenue"),
                width: pixel(120),
                align: "end",
                renderCell: (row) =>
                  formatMoney(row.revenue, {
                    locale,
                    currency: row.currency,
                  }),
              },
              {
                key: "channel",
                header: t("columns.channel"),
                width: pixel(120),
                renderCell: (row) => tChannels(row.channel),
              },
            ]}
          />
        )}
      </Stack>
    </Stack>
  );
}
