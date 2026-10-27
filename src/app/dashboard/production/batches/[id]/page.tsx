import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {BatchActions} from "@/components/production/batch-actions";
import {
  BatchInputsTable,
  BatchOutputsTable,
} from "@/components/production/batch-tables";
import {CostBreakdown} from "@/components/recipes/cost-breakdown";
import {formatBusinessDate, formatQuantity} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {productionService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type BatchParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: BatchParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("production:read");
  const view = await productionService.getBatch(actor, id);
  const t = await getTranslations("Production");

  return {title: view ? `${view.batch.code} · ${t("title")}` : t("metadataTitle")};
}

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

export default async function BatchDetailPage({params}: BatchParams) {
  const {id} = await params;
  const actor = await requirePermission("production:read");
  const view = await productionService.getBatch(actor, id);

  if (!view) notFound();

  const t = await getTranslations("Production");
  const locale = await getLocale();
  const {batch} = view;

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={batch.code}
            intro={`${batch.recipeName} · v${batch.recipeVersionNumber} · ${batch.siteName}`}
            actions={
              <HStack gap={2} wrap="wrap">
                <Badge
                  label={t(`statuses.${batch.status}`)}
                  variant={
                    batch.status === "COMPLETED"
                      ? "success"
                      : batch.status === "CANCELLED"
                        ? "neutral"
                        : "warning"
                  }
                />
                <Button
                  label={t("backToProduction")}
                  variant="secondary"
                  href="/dashboard/production"
                />
              </HStack>
            }
          />

          <Card padding={5}>
            <Grid columns={{minWidth: 180, max: 3}} gap={4}>
              <Definition
                label={t("columns.planned")}
                value={`${formatQuantity(batch.plannedQuantity, {locale})} ${batch.unitCode}`}
              />
              <Definition
                label={t("columns.actual")}
                value={
                  batch.actualQuantity
                    ? `${formatQuantity(batch.actualQuantity, {locale})} ${batch.unitCode}`
                    : "—"
                }
              />
              <Definition
                label={t("fields.outputItem")}
                value={batch.outputItemName}
              />
              <Definition
                label={t("fields.recipeYield")}
                value={`${batch.recipeYieldQuantity} ${batch.recipeYieldUnitCode}`}
              />
              <Definition
                label={t("fields.plannedStart")}
                value={
                  batch.plannedStartAt
                    ? formatBusinessDate(batch.plannedStartAt, {locale})
                    : "—"
                }
              />
              <Definition
                label={t("fields.producedOn")}
                value={
                  batch.producedOn
                    ? formatBusinessDate(batch.producedOn, {locale})
                    : "—"
                }
              />
            </Grid>
          </Card>

          <BatchActions
            batchId={batch.id}
            status={batch.status}
            canExecute={view.canExecute}
            canWrite={view.canWrite}
          />

          {batch.cost ? <CostBreakdown cost={batch.cost} /> : null}

          <Stack gap={3}>
            <Heading level={2}>{t("inputs.title")}</Heading>
            <Text type="supporting">{t("inputs.intro")}</Text>
            <BatchInputsTable
              inputs={batch.inputs}
              currency={batch.cost?.currency ?? "EUR"}
            />
          </Stack>

          <Stack gap={3}>
            <Heading level={2}>{t("outputs.title")}</Heading>
            <Text type="supporting">{t("outputs.intro")}</Text>
            <BatchOutputsTable
              outputs={batch.outputs}
              currency={batch.cost?.currency ?? "EUR"}
            />
          </Stack>
        </Stack>
      </Center>
    </Section>
  );
}
