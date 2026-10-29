"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Divider} from "@astryxdesign/core/Divider";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {Grid} from "@astryxdesign/core/Grid";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {simulateRecipeAction} from "@/app/actions/recipe.actions";
import {FormTextInput} from "@/components/form-text-input";
import {formatMoney, formatPercent} from "@/lib/format";
import type {RecipeSimulationRecord} from "@/lib/dto";
import {
  createSimulationSchema,
  type SimulationValues,
} from "@/server/validators/simulation.schema";

function Definition({label, value}: {label: string; value: string}) {
  return (
    <Stack gap={1}>
      <Text type="label" color="secondary">
        {label}
      </Text>
      <Text>{value}</Text>
    </Stack>
  );
}

export function PriceSimulator({
  versionId,
  salePrice,
  canSimulate,
}: {
  versionId: string;
  salePrice: string | null;
  canSimulate: boolean;
}) {
  const t = useTranslations("Recipes.simulation");
  const tValidation = useTranslations("Recipes.simulation.validation");
  const tErrors = useTranslations("Settings.errors");
  const locale = useLocale();
  const [simulation, setSimulation] =
    useState<RecipeSimulationRecord | null>(null);

  const schema = useMemo(
    () => createSimulationSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError,
    formState: {errors, isSubmitting},
  } = useForm<SimulationValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      materialPct: "0",
      packagingPct: "0",
      labourPct: "0",
      energyPct: "0",
      salePrice: salePrice ?? "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: SimulationValues) {
    setSimulation(null);
    const result = await simulateRecipeAction(versionId, values);

    if (!result.ok) {
      setError("root", {
        type: "server",
        message: tErrors(result.error),
      });
      return;
    }

    setSimulation(result.simulation);
  }

  if (!canSimulate) return null;

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Heading level={2}>{t("title")}</Heading>
        <Text type="supporting">{t("intro")}</Text>
      </Stack>

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
                name="materialPct"
                label={t("fields.materialPct")}
              />
              <FormTextInput
                control={control}
                name="packagingPct"
                label={t("fields.packagingPct")}
              />
              <FormTextInput
                control={control}
                name="labourPct"
                label={t("fields.labourPct")}
              />
              <FormTextInput
                control={control}
                name="energyPct"
                label={t("fields.energyPct")}
              />
              <FormTextInput
                control={control}
                name="salePrice"
                label={t("fields.salePrice")}
                description={t("fields.salePriceHint")}
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

      {simulation ? (
        <Card padding={5}>
          <Stack gap={4}>
            {simulation.warnings.length > 0 ? (
              <Banner
                status="warning"
                title={t("warningsTitle")}
                description={simulation.warnings
                  .map((warning) =>
                    t(`warnings.${warning.code}`, {subject: warning.subject}),
                  )
                  .join(" ")}
              />
            ) : null}

            <Grid columns={{minWidth: 180, max: 3}} gap={4}>
              <Definition
                label={t("results.baseCost")}
                value={formatMoney(simulation.base.costPerUnit, {
                  locale,
                  currency: simulation.base.currency,
                })}
              />
              <Definition
                label={t("results.simulatedCost")}
                value={formatMoney(simulation.simulated.costPerUnit, {
                  locale,
                  currency: simulation.simulated.currency,
                })}
              />
              <Definition
                label={t("results.costDelta")}
                value={
                  simulation.costDeltaPct
                    ? formatPercent(simulation.costDeltaPct, {locale})
                    : "—"
                }
              />
              <Definition
                label={t("results.baseMargin")}
                value={
                  simulation.base.marginPct
                    ? formatPercent(simulation.base.marginPct, {locale})
                    : "—"
                }
              />
              <Definition
                label={t("results.simulatedMargin")}
                value={
                  simulation.simulated.marginPct
                    ? formatPercent(simulation.simulated.marginPct, {locale})
                    : "—"
                }
              />
              <Definition
                label={t("results.marginDelta")}
                value={
                  simulation.marginDeltaPp === null
                    ? "—"
                    : `${simulation.marginDeltaPp > 0 ? "+" : ""}${simulation.marginDeltaPp} pp`
                }
              />
            </Grid>

            <Divider />
            <Grid columns={{minWidth: 180, max: 3}} gap={4}>
              <Definition
                label={t("results.materials")}
                value={formatMoney(simulation.simulated.materialCost, {
                  locale,
                  currency: simulation.simulated.currency,
                })}
              />
              <Definition
                label={t("results.packaging")}
                value={formatMoney(simulation.simulated.packagingCost, {
                  locale,
                  currency: simulation.simulated.currency,
                })}
              />
              <Definition
                label={t("results.labour")}
                value={formatMoney(simulation.simulated.labourCost, {
                  locale,
                  currency: simulation.simulated.currency,
                })}
              />
              <Definition
                label={t("results.energy")}
                value={formatMoney(simulation.simulated.energyCost, {
                  locale,
                  currency: simulation.simulated.currency,
                })}
              />
              <Definition
                label={t("results.overhead")}
                value={formatMoney(simulation.simulated.overheadCost, {
                  locale,
                  currency: simulation.simulated.currency,
                })}
              />
              <Definition
                label={t("results.total")}
                value={formatMoney(simulation.simulated.totalCost, {
                  locale,
                  currency: simulation.simulated.currency,
                })}
              />
            </Grid>
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );
}
