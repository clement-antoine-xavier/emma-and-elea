import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {LotMovementsTable} from "@/components/stock/lot-movements-table";
import {formatBusinessDate, formatMoney, formatQuantity} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {
  productionService,
  stockService,
} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type LotParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: LotParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("stock:read");
  const lot = await stockService.getLot(actor, id);
  const t = await getTranslations("Stock.lots");

  return {title: lot ? `${lot.lotNumber} · ${t("title")}` : t("metadataTitle")};
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

export default async function LotDetailPage({params}: LotParams) {
  const {id} = await params;
  const actor = await requirePermission("stock:read");
  const lot = await stockService.getLot(actor, id);

  if (!lot) notFound();

  const [t, tLot, tTrace, locale, trace] = await Promise.all([
    getTranslations("Stock.lots"),
    getTranslations("Stock.lot"),
    getTranslations("Stock.trace"),
    getLocale(),
    productionService.getTrace(actor, lot.id),
  ]);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={lot.lotNumber}
            intro={`${lot.itemName} · ${lot.siteName}`}
            actions={
              <Button
                label={tLot("backToLots")}
                variant="secondary"
                href="/dashboard/stock/lots"
              />
            }
          />

          <Card padding={5}>
            <Grid columns={{minWidth: 180, max: 3}} gap={4}>
              <Definition
                label={tLot("fields.item")}
                value={`${lot.itemCode} · ${lot.itemName}`}
              />
              <Definition label={tLot("fields.site")} value={lot.siteName} />
              <Definition
                label={tLot("fields.received")}
                value={formatBusinessDate(lot.receivedAt, {locale})}
              />
              <Definition
                label={tLot("fields.expires")}
                value={
                  lot.expiresOn
                    ? formatBusinessDate(lot.expiresOn, {locale})
                    : "—"
                }
              />
              <Definition
                label={tLot("fields.quantityReceived")}
                value={`${formatQuantity(lot.quantityReceived, {locale})} ${lot.unitCode}`}
              />
              <Definition
                label={tLot("fields.quantityRemaining")}
                value={`${formatQuantity(lot.quantityRemaining, {locale})} ${lot.unitCode}`}
              />
              <Definition
                label={tLot("fields.unitCost")}
                value={formatMoney(lot.unitCost, {
                  locale,
                  currency: lot.currency,
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 4,
                })}
              />
              <Definition
                label={tLot("fields.status")}
                value={t(`statuses.${lot.status}`)}
              />
            </Grid>
          </Card>

          <Stack gap={3}>
            <Heading level={2}>{tLot("movementsTitle")}</Heading>
            <Text type="supporting">{tLot("movementsIntro")}</Text>
            <LotMovementsTable movements={lot.movements} />
          </Stack>

          {trace ? (
            <Stack gap={3}>
              <Heading level={2}>{tTrace("title")}</Heading>
              <Text type="supporting">{tTrace("intro")}</Text>
              <Card padding={5}>
                <Grid columns={{minWidth: 220, max: 3}} gap={4}>
                  <Definition
                    label={tTrace("source")}
                    value={trace.source?.label ?? tTrace("unknownSource")}
                  />
                  <Definition
                    label={tTrace("sourceLots")}
                    value={
                      trace.sourceLots.length > 0
                        ? trace.sourceLots
                            .map(
                              (sourceLot) =>
                                `${sourceLot.lotNumber} · ${sourceLot.itemName}`,
                            )
                            .join(", ")
                        : tTrace("none")
                    }
                  />
                  <Definition
                    label={tTrace("consumedBy")}
                    value={
                      trace.consumedBy.length > 0
                        ? trace.consumedBy
                            .map((batch) =>
                              batch.outputs.length > 0
                                ? `${batch.batchCode} → ${batch.outputs
                                    .map(
                                      (output) =>
                                        `${output.lotNumber} (${output.itemName})`,
                                    )
                                    .join(", ")}`
                                : batch.batchCode,
                            )
                            .join(" · ")
                        : tTrace("none")
                    }
                  />
                </Grid>
              </Card>
            </Stack>
          ) : null}
        </Stack>
      </Center>
    </Section>
  );
}
