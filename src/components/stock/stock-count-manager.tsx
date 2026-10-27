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
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {createStockCountAction} from "@/app/actions/stock-count.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatBusinessDate} from "@/lib/format";
import type {StockCountSummaryRecord} from "@/lib/dto";
import {
  stockCountInputSchema,
  type StockCountInputValues,
} from "@/server/validators/stock-count.schema";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function StockCountManager({
  counts,
  sites,
  canCount,
}: {
  counts: StockCountSummaryRecord[];
  sites: {id: string; name: string; code: string}[];
  canCount: boolean;
}) {
  const t = useTranslations("Stock.counts");
  const tStatuses = useTranslations("Stock.counts.statuses");
  const tValidation = useTranslations("Stock.counts.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => stockCountInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<StockCountInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      siteId: sites[0]?.id ?? "",
      countedAt: todayIso(),
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: StockCountInputValues) {
    setError(null);
    const result = await createStockCountAction(values);
    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }
    reset();
    if (result.countId) {
      router.push(`/dashboard/stock/counts/${result.countId}`);
      router.refresh();
    }
  }

  return (
    <Stack gap={6}>
      {canCount ? (
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
                <FormDateInput
                  control={control}
                  name="countedAt"
                  label={t("fields.countedAt")}
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

        {counts.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<StockCountSummaryRecord>
            data={counts}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "date",
                header: t("columns.date"),
                width: pixel(140),
                renderCell: (count) =>
                  formatBusinessDate(count.countedAt, {locale}),
              },
              {
                key: "site",
                header: t("columns.site"),
                width: proportional(3),
                renderCell: (count) => count.siteName,
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(130),
                renderCell: (count) => (
                  <Badge
                    label={tStatuses(count.status)}
                    variant={
                      count.status === "POSTED"
                        ? "success"
                        : count.status === "CANCELLED"
                          ? "neutral"
                          : "warning"
                    }
                  />
                ),
              },
              {
                key: "lines",
                header: t("columns.lines"),
                width: pixel(90),
                align: "end",
                renderCell: (count) => String(count.lineCount),
              },
              {
                key: "actions",
                header: "",
                width: pixel(100),
                renderCell: (count) => (
                  <Button
                    label={t("open")}
                    variant="ghost"
                    size="sm"
                    href={`/dashboard/stock/counts/${count.id}`}
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
