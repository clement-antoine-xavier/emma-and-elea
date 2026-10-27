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
  closeEnergyTariffAction,
  createEnergyTariffAction,
} from "@/app/actions/rate.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatBusinessDate, formatMoney} from "@/lib/format";
import {
  createEnergyTariffSchema,
  ENERGY_KINDS,
  type CreateEnergyTariffValues,
} from "@/server/validators/rate.schema";
import type {
  EnergyTariffRecord,
  SiteRecord,
} from "@/lib/dto";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EnergyTariffManager({
  tariffs,
  sites,
  canWrite,
}: {
  tariffs: EnergyTariffRecord[];
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

  const activeSites = sites.filter((site) => !site.archivedAt);

  const schema = useMemo(
    () => createEnergyTariffSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<CreateEnergyTariffValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      siteId: activeSites[0]?.id ?? "",
      energyKind: "ELECTRICITY",
      pricePerKwh: "",
      validFrom: todayIso(),
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: CreateEnergyTariffValues) {
    setError(null);
    const result = await createEnergyTariffAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset({...values, pricePerKwh: ""});
    router.refresh();
  }

  async function close(tariff: EnergyTariffRecord) {
    setError(null);
    setPendingId(tariff.id);

    try {
      const result = await closeEnergyTariffAction({id: tariff.id});
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
    <Stack gap={6}>
      <Stack gap={1}>
        <Heading level={2}>{t("energy.title")}</Heading>
        <Text type="supporting">{t("energy.intro")}</Text>
      </Stack>

      {canWrite && activeSites.length > 0 ? (
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
                <FormSelector
                  control={control}
                  name="siteId"
                  label={t("energy.fields.site")}
                  options={activeSites.map((site) => ({
                    value: site.id,
                    label: `${site.code} · ${site.name}`,
                  }))}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="energyKind"
                  label={t("energy.fields.kind")}
                  options={ENERGY_KINDS.map((kind) => ({
                    value: kind,
                    label: t(`kinds.${kind}`),
                  }))}
                />
                <FormTextInput
                  control={control}
                  name="pricePerKwh"
                  label={t("energy.fields.pricePerKwh")}
                  description={t("energy.fields.pricePerKwhHint")}
                  isRequired
                />
                <FormDateInput
                  control={control}
                  name="validFrom"
                  label={t("energy.fields.validFrom")}
                  description={t("energy.fields.validFromHint")}
                  isRequired
                />
              </FormLayout>

              <Button
                type="submit"
                variant="primary"
                label={t("energy.submit")}
                isLoading={isSubmitting}
              />
            </Stack>
          </form>
        </Card>
      ) : null}

      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      {tariffs.length === 0 ? (
        <Card padding={4}>
          <EmptyState
            title={t("energy.emptyTitle")}
            description={t("energy.emptyBody")}
            isCompact
          />
        </Card>
      ) : (
        <Table<EnergyTariffRecord>
          data={tariffs}
          idKey="id"
          density="compact"
          columns={[
            {
              key: "site",
              header: t("energy.columns.site"),
              width: proportional(2),
              renderCell: (tariff) => tariff.siteName,
            },
            {
              key: "kind",
              header: t("energy.columns.kind"),
              width: proportional(1),
              renderCell: (tariff) => t(`kinds.${tariff.energyKind}`),
            },
            {
              key: "price",
              header: t("energy.columns.pricePerKwh"),
              width: proportional(1),
              align: "end",
              renderCell: (tariff) =>
                formatMoney(tariff.pricePerKwh, {
                  locale,
                  currency: tariff.currency,
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 4,
                }),
            },
            {
              key: "validFrom",
              header: t("energy.columns.validFrom"),
              width: proportional(1),
              renderCell: (tariff) =>
                formatBusinessDate(tariff.validFrom, {locale}),
            },
            {
              key: "status",
              header: t("energy.columns.status"),
              width: proportional(1),
              renderCell: (tariff) => (
                <Badge
                  label={
                    tariff.validTo ? t("closed") : t("active")
                  }
                  variant={tariff.validTo ? "neutral" : "success"}
                />
              ),
            },
            {
              key: "actions",
              header: "",
              width: pixel(130),
              renderCell: (tariff) =>
                canWrite && !tariff.validTo ? (
                  <HStack gap={2}>
                    <Button
                      label={t("close")}
                      variant="ghost"
                      size="sm"
                      isLoading={pendingId === tariff.id}
                      onClick={() => close(tariff)}
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
