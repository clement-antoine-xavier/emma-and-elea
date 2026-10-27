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
  archiveLabourRateAction,
  createLabourRateAction,
} from "@/app/actions/rate.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatBusinessDate, formatMoney} from "@/lib/format";
import {
  createLabourRateSchema,
  type CreateLabourRateValues,
} from "@/server/validators/rate.schema";
import type {
  LabourRateRecord,
  SiteRecord,
} from "@/lib/dto";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LabourRateManager({
  rates,
  sites,
  canWrite,
}: {
  rates: LabourRateRecord[];
  sites: SiteRecord[];
  canWrite: boolean;
}) {
  const t = useTranslations("Rates");
  const tValidation = useTranslations("Rates.validation");
  const tErrors = useTranslations("Settings.errors");
  const locale = useLocale();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => createLabourRateSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<CreateLabourRateValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: "",
      hourlyCost: "",
      siteId: "",
      validFrom: todayIso(),
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: CreateLabourRateValues) {
    setError(null);
    const result = await createLabourRateAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset({...values, label: "", hourlyCost: ""});
    router.refresh();
  }

  async function archive(rate: LabourRateRecord) {
    setError(null);
    setPendingId(rate.id);

    try {
      const result = await archiveLabourRateAction({id: rate.id});
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  const activeSites = sites.filter((site) => !site.archivedAt);

  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <Heading level={2}>{t("labour.title")}</Heading>
        <Text type="supporting">{t("labour.intro")}</Text>
      </Stack>

      {canWrite ? (
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
                <FormTextInput
                  control={control}
                  name="label"
                  label={t("labour.fields.label")}
                  description={t("labour.fields.labelHint")}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="hourlyCost"
                  label={t("labour.fields.hourlyCost")}
                  description={t("labour.fields.hourlyCostHint")}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="siteId"
                  label={t("labour.fields.site")}
                  options={[
                    {value: "", label: t("allSites")},
                    ...activeSites.map((site) => ({
                      value: site.id,
                      label: `${site.code} · ${site.name}`,
                    })),
                  ]}
                />
                <FormDateInput
                  control={control}
                  name="validFrom"
                  label={t("labour.fields.validFrom")}
                  description={t("labour.fields.validFromHint")}
                  isRequired
                />
              </FormLayout>

              <Button
                type="submit"
                variant="primary"
                label={t("labour.submit")}
                isLoading={isSubmitting}
              />
            </Stack>
          </form>
        </Card>
      ) : null}

      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      {rates.length === 0 ? (
        <Card padding={4}>
          <EmptyState
            title={t("labour.emptyTitle")}
            description={t("labour.emptyBody")}
            isCompact
          />
        </Card>
      ) : (
        <Table<LabourRateRecord>
          data={rates}
          idKey="id"
          density="compact"
          columns={[
            {
              key: "label",
              header: t("labour.columns.label"),
              width: proportional(2),
              renderCell: (rate) => rate.label,
            },
            {
              key: "site",
              header: t("labour.columns.site"),
              width: proportional(2),
              renderCell: (rate) => rate.siteName ?? t("allSites"),
            },
            {
              key: "hourlyCost",
              header: t("labour.columns.hourlyCost"),
              width: proportional(1),
              align: "end",
              renderCell: (rate) =>
                formatMoney(rate.hourlyCost, {
                  locale,
                  currency: rate.currency,
                }),
            },
            {
              key: "validFrom",
              header: t("labour.columns.validFrom"),
              width: proportional(1),
              renderCell: (rate) =>
                formatBusinessDate(rate.validFrom, {locale}),
            },
            {
              key: "status",
              header: t("labour.columns.status"),
              width: proportional(1),
              renderCell: (rate) => (
                <Badge
                  label={rate.archivedAt ? t("archived") : t("active")}
                  variant={rate.archivedAt ? "neutral" : "success"}
                />
              ),
            },
            {
              key: "actions",
              header: "",
              width: pixel(120),
              renderCell: (rate) =>
                canWrite && !rate.archivedAt ? (
                  <HStack gap={2}>
                    <Button
                      label={t("archive")}
                      variant="ghost"
                      size="sm"
                      isLoading={pendingId === rate.id}
                      onClick={() => archive(rate)}
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
