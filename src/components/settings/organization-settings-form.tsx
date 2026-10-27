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
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {updateOrganizationSettingsAction} from "@/app/actions/settings.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {
  updateOrganizationSettingsSchema,
  type UpdateOrganizationSettingsValues,
} from "@/server/validators/settings.schema";
import type {OrganizationSettingsRecord} from "@/lib/dto";

export function OrganizationSettingsForm({
  settings,
}: {
  settings: OrganizationSettingsRecord;
}) {
  const t = useTranslations("Settings.organization");
  const tValidation = useTranslations("Settings.validation");
  const tErrors = useTranslations("Settings.errors");
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const schema = useMemo(
    () => updateOrganizationSettingsSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError,
    formState: {errors, isSubmitting},
  } = useForm<UpdateOrganizationSettingsValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: settings.currency,
      overheadPct: settings.overheadPct,
      forecastHistoryDays: String(settings.forecastHistoryDays),
      forecastSafetyPct: settings.forecastSafetyPct,
      defaultShelfLifeDays:
        settings.defaultShelfLifeDays === null
          ? ""
          : String(settings.defaultShelfLifeDays),
      lotNumberPattern: settings.lotNumberPattern,
      pricesIncludeVat: settings.pricesIncludeVat ? "true" : "false",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: UpdateOrganizationSettingsValues) {
    setSaved(false);
    const result = await updateOrganizationSettingsAction(values);

    if (!result.ok) {
      setError("root", {
        type: "server",
        message: tErrors(result.error),
      });
      return;
    }

    setSaved(true);
    router.refresh();
  }

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
              name="currency"
              label={t("fields.currency")}
              description={t("fields.currencyHint")}
              isRequired
            />
            <FormTextInput
              control={control}
              name="overheadPct"
              label={t("fields.overheadPct")}
              description={t("fields.overheadPctHint")}
              isRequired
            />
            <FormTextInput
              control={control}
              name="forecastHistoryDays"
              label={t("fields.forecastHistoryDays")}
              description={t("fields.forecastHistoryDaysHint")}
              isRequired
            />
            <FormTextInput
              control={control}
              name="forecastSafetyPct"
              label={t("fields.forecastSafetyPct")}
              description={t("fields.forecastSafetyPctHint")}
              isRequired
            />
            <FormTextInput
              control={control}
              name="defaultShelfLifeDays"
              label={t("fields.defaultShelfLifeDays")}
              description={t("fields.defaultShelfLifeDaysHint")}
            />
            <FormTextInput
              control={control}
              name="lotNumberPattern"
              label={t("fields.lotNumberPattern")}
              description={t("fields.lotNumberPatternHint")}
              isRequired
            />
            <FormSelector
              control={control}
              name="pricesIncludeVat"
              label={t("fields.pricesIncludeVat")}
              options={[
                {value: "true", label: t("vat.included")},
                {value: "false", label: t("vat.excluded")},
              ]}
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
