import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Divider} from "@astryxdesign/core/Divider";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {PropertyList} from "@/components/layout/property-list";
import {PrintButton} from "@/components/print-button";
import {LotMovementsTable} from "@/components/stock/lot-movements-table";
import {formatBusinessDate, formatQuantity} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {
  productionService,
  stockService,
} from "@/server/services/container";

type LotParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: LotParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("stock:read");
  const lot = await stockService.getLot(actor, id);
  const t = await getTranslations("Stock.inspection");

  return {title: lot ? `${lot.lotNumber} · ${t("title")}` : t("metadataTitle")};
}

export default async function LotInspectionPage({params}: LotParams) {
  const {id} = await params;
  const actor = await requirePermission("stock:read");
  const lot = await stockService.getLot(actor, id);

  if (!lot) notFound();

  const [t, tTrace, locale, trace] = await Promise.all([
    getTranslations("Stock.inspection"),
    getTranslations("Stock.trace"),
    getLocale(),
    productionService.getTrace(actor, lot.id),
  ]);

  return (
    <PageShell
      title={`${t("title")} · ${lot.lotNumber}`}
      intro={`${lot.itemCode} · ${lot.itemName} · ${lot.siteName}`}
      actions={
        <HStack gap={2} wrap="wrap">
          <PrintButton />
          <Button
            label={t("back")}
            variant="secondary"
            href={`/dashboard/stock/lots/${lot.id}`}
          />
        </HStack>
      }
      contentWidth={1000}
    >
      <Stack gap={6} data-print-sheet>
        <Stack gap={1}>
          <Heading level={1}>{`${t("title")} · ${lot.lotNumber}`}</Heading>
          <Text type="supporting">
            {`${lot.itemCode} · ${lot.itemName} · ${lot.siteName}`}
          </Text>
        </Stack>

        <Card padding={5}>
          <PropertyList
            columns="multi"
            labelPosition="start"
            items={[
              {label: t("fields.item"), value: `${lot.itemCode} · ${lot.itemName}`},
              {label: t("fields.site"), value: lot.siteName},
              {
                label: t("fields.received"),
                value: formatBusinessDate(lot.receivedAt, {locale}),
              },
              {
                label: t("fields.expires"),
                value: lot.expiresOn
                  ? formatBusinessDate(lot.expiresOn, {locale})
                  : "—",
              },
              {
                label: t("fields.quantityReceived"),
                value: `${formatQuantity(lot.quantityReceived, {locale})} ${lot.unitCode}`,
              },
              {
                label: t("fields.quantityRemaining"),
                value: `${formatQuantity(lot.quantityRemaining, {locale})} ${lot.unitCode}`,
              },
            ]}
          />
        </Card>

        {trace ? (
          <>
            <Divider />
            <Stack gap={2}>
              <Heading level={2}>{tTrace("title")}</Heading>
              <PropertyList
                columns="single"
                labelPosition="start"
                items={[
                  {
                    label: tTrace("source"),
                    value: trace.source?.label ?? tTrace("unknownSource"),
                  },
                  {
                    label: tTrace("sourceLots"),
                    value:
                      trace.sourceLots.length > 0
                        ? trace.sourceLots
                            .map(
                              (source) =>
                                `${source.lotNumber} · ${source.itemName}`,
                            )
                            .join(", ")
                        : tTrace("none"),
                  },
                  {
                    label: tTrace("consumedBy"),
                    value:
                      trace.consumedBy.length > 0
                        ? trace.consumedBy
                            .map((batch) => batch.batchCode)
                            .join(", ")
                        : tTrace("none"),
                  },
                  {
                    label: tTrace("dispatchedTo"),
                    value:
                      trace.dispatchedTo.length > 0
                        ? trace.dispatchedTo
                            .map(
                              (dispatch) =>
                                `${dispatch.number}${
                                  dispatch.customerName
                                    ? ` · ${dispatch.customerName}`
                                    : ""
                                }`,
                            )
                            .join(", ")
                        : tTrace("none"),
                  },
                  {
                    label: tTrace("waste"),
                    value:
                      trace.waste.length > 0
                        ? trace.waste
                            .map((record) => `${record.quantity} ${record.unitCode}`)
                            .join(", ")
                        : tTrace("none"),
                  },
                ]}
              />
            </Stack>
          </>
        ) : null}

        <Divider />
        <Stack gap={2}>
          <Heading level={2}>{t("movementsTitle")}</Heading>
          <Text type="supporting">{t("movementsIntro")}</Text>
          <LotMovementsTable movements={lot.movements} />
        </Stack>
      </Stack>
    </PageShell>
  );
}
