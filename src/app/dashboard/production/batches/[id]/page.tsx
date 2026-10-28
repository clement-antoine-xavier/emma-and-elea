import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Divider} from "@astryxdesign/core/Divider";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {PropertyList} from "@/components/layout/property-list";
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

export default async function BatchDetailPage({params}: BatchParams) {
  const {id} = await params;
  const actor = await requirePermission("production:read");
  const view = await productionService.getBatch(actor, id);

  if (!view) notFound();

  const [t, locale] = await Promise.all([
    getTranslations("Production"),
    getLocale(),
  ]);
  const {batch} = view;

  return (
    <PageShell
      title={batch.code}
      intro={`${batch.recipeName} · v${batch.recipeVersionNumber} · ${batch.siteName}`}
      actions={
        <Button
          label={t("backToProduction")}
          variant="secondary"
          href="/dashboard/production"
        />
      }
      contentWidth={1280}
    >
      <DetailShell
        asideLabel={t(`statuses.${batch.status}`)}
        aside={
          <Stack gap={4}>
            <Card padding={5}>
              <PropertyList
                columns="single"
                labelPosition="start"
                items={[
                  {
                    label: t("columns.status"),
                    value: (
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
                    ),
                  },
                  {
                    label: t("columns.planned"),
                    value: `${formatQuantity(batch.plannedQuantity, {locale})} ${batch.unitCode}`,
                  },
                  {
                    label: t("columns.actual"),
                    value: batch.actualQuantity
                      ? `${formatQuantity(batch.actualQuantity, {locale})} ${batch.unitCode}`
                      : "—",
                  },
                  {
                    label: t("fields.outputItem"),
                    value: batch.outputItemName,
                  },
                  {
                    label: t("fields.recipeYield"),
                    value: `${batch.recipeYieldQuantity} ${batch.recipeYieldUnitCode}`,
                  },
                  {
                    label: t("fields.plannedStart"),
                    value: batch.plannedStartAt
                      ? formatBusinessDate(batch.plannedStartAt, {locale})
                      : "—",
                  },
                  {
                    label: t("fields.producedOn"),
                    value: batch.producedOn
                      ? formatBusinessDate(batch.producedOn, {locale})
                      : "—",
                  },
                ]}
              />
            </Card>

            <Card padding={5}>
              <BatchActions
                batchId={batch.id}
                status={batch.status}
                canExecute={view.canExecute}
                canWrite={view.canWrite}
              />
            </Card>

            {batch.cost ? <CostBreakdown cost={batch.cost} /> : null}
          </Stack>
        }
      >
        <Stack gap={6}>
          <Stack gap={3}>
            <Heading level={2}>{t("inputs.title")}</Heading>
            <Text type="supporting">{t("inputs.intro")}</Text>
            <BatchInputsTable
              inputs={batch.inputs}
              currency={batch.cost?.currency ?? "EUR"}
            />
          </Stack>

          <Divider />

          <Stack gap={3}>
            <Heading level={2}>{t("outputs.title")}</Heading>
            <Text type="supporting">{t("outputs.intro")}</Text>
            <BatchOutputsTable
              outputs={batch.outputs}
              currency={batch.cost?.currency ?? "EUR"}
            />
          </Stack>
        </Stack>
      </DetailShell>
    </PageShell>
  );
}
