"use client";

import {useMemo} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {createPlanAction} from "@/app/actions/planning.actions";
import {FormSwitch} from "@/components/form-switch";
import {FormTextInput} from "@/components/form-text-input";
import {
  planInputSchema,
  type PlanInputValues,
} from "@/server/validators/planning.schema";

export function PlanCreateForm({
  siteId,
  plannedFor,
  forecastCount,
  orderCount,
  canWrite,
}: {
  siteId: string;
  plannedFor: string;
  forecastCount: number;
  orderCount: number;
  canWrite: boolean;
}) {
  const t = useTranslations("Production.planning.create");
  const tValidation = useTranslations("Production.planning.validation");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();

  const schema = useMemo(
    () => planInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<PlanInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      siteId,
      plannedFor,
      includeForecast: forecastCount > 0,
      includeOrders: orderCount > 0,
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: PlanInputValues) {
    if (!values.includeForecast && !values.includeOrders) {
      setFormError("root", {
        type: "server",
        message: t("chooseSource"),
      });
      return;
    }

    const result = await createPlanAction(values);
    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    if (result.planId) {
      router.push(`/dashboard/production/planning/${result.planId}`);
      router.refresh();
    }
  }

  if (!canWrite) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack gap={4}>
        <Stack gap={1}>
          <Heading level={2}>{t("title")}</Heading>
          <Text type="supporting">{t("intro")}</Text>
        </Stack>

        {errors.root?.message ? (
          <Banner
            status="error"
            title={t("errorTitle")}
            description={errors.root.message}
          />
        ) : null}

        <FormLayout>
          <FormSwitch
            control={control}
            name="includeForecast"
            label={t("forecast")}
            description={t("forecastHint", {count: forecastCount})}
            isDisabled={forecastCount === 0}
          />
          <FormSwitch
            control={control}
            name="includeOrders"
            label={t("orders")}
            description={t("ordersHint", {count: orderCount})}
            isDisabled={orderCount === 0}
          />
          <FormTextInput
            control={control}
            name="note"
            label={t("note")}
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
  );
}
