import type {Metadata} from "next";
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
    <PageShell
      title={lot.lotNumber}
      intro={`${lot.itemName} · ${lot.siteName}`}
      actions={
        <Button
          label={tLot("backToLots")}
          variant="secondary"
          href="/dashboard/stock/lots"
        />
      }
      contentWidth={1280}
    >
      <DetailShell
        asideLabel={tLot("fields.status")}
        aside={
          <Card padding={5}>
            <PropertyList
              columns="single"
              labelPosition="start"
              items={[
                {
                  label: tLot("fields.item"),
                  value: `${lot.itemCode} · ${lot.itemName}`,
                },
                {label: tLot("fields.site"), value: lot.siteName},
                {
                  label: tLot("fields.received"),
                  value: formatBusinessDate(lot.receivedAt, {locale}),
                },
                {
                  label: tLot("fields.expires"),
                  value: lot.expiresOn
                    ? formatBusinessDate(lot.expiresOn, {locale})
                    : "—",
                },
                {
                  label: tLot("fields.quantityReceived"),
                  value: `${formatQuantity(lot.quantityReceived, {locale})} ${lot.unitCode}`,
                },
                {
                  label: tLot("fields.quantityRemaining"),
                  value: `${formatQuantity(lot.quantityRemaining, {locale})} ${lot.unitCode}`,
                },
                {
                  label: tLot("fields.unitCost"),
                  value: formatMoney(lot.unitCost, {
                    locale,
                    currency: lot.currency,
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 4,
                  }),
                },
                {
                  label: tLot("fields.status"),
                  value: t(`statuses.${lot.status}`),
                },
              ]}
            />
          </Card>
        }
      >
        <Stack gap={6}>
          <Stack gap={3}>
            <Heading level={2}>{tLot("movementsTitle")}</Heading>
            <Text type="supporting">{tLot("movementsIntro")}</Text>
            <LotMovementsTable movements={lot.movements} />
          </Stack>

          {trace ? (
            <>
              <Divider />
              <Stack gap={3}>
                <Heading level={2}>{tTrace("title")}</Heading>
                <Text type="supporting">{tTrace("intro")}</Text>
                <Card padding={5}>
                  <PropertyList
                    columns="single"
                    labelPosition="start"
                    items={[
                      {
                        label: tTrace("source"),
                        value:
                          trace.source?.label ?? tTrace("unknownSource"),
                      },
                      {
                        label: tTrace("sourceLots"),
                        value:
                          trace.sourceLots.length > 0
                            ? trace.sourceLots
                                .map(
                                  (sourceLot) =>
                                    `${sourceLot.lotNumber} · ${sourceLot.itemName}`,
                                )
                                .join(", ")
                            : tTrace("none"),
                      },
                      {
                        label: tTrace("consumedBy"),
                        value:
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
                            : tTrace("none"),
                      },
                    ]}
                  />
                </Card>
              </Stack>
            </>
          ) : null}
        </Stack>
      </DetailShell>
    </PageShell>
  );
}
