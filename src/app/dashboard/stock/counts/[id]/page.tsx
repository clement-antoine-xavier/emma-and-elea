import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {StockCountDetail} from "@/components/stock/stock-count-detail";
import {formatBusinessDate} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {stockCountService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type StockCountParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: StockCountParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("stock:read");
  const view = await stockCountService.getCount(actor, id);
  const [t, locale] = await Promise.all([
    getTranslations("Stock.counts"),
    getLocale(),
  ]);

  return {
    title: view
      ? `${t("detailTitle")} · ${formatBusinessDate(view.count.countedAt, {
          locale,
        })}`
      : t("metadataTitle"),
  };
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

export default async function StockCountDetailPage({
  params,
}: StockCountParams) {
  const {id} = await params;
  const actor = await requirePermission("stock:read");
  const view = await stockCountService.getCount(actor, id);

  if (!view) notFound();

  const [t, tStatuses, locale] = await Promise.all([
    getTranslations("Stock.counts"),
    getTranslations("Stock.counts.statuses"),
    getLocale(),
  ]);
  const count = view.count;

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={t("detailTitle")}
            intro={`${formatBusinessDate(count.countedAt, {locale})} · ${count.siteName}`}
            actions={
              <Button
                label={t("back")}
                variant="secondary"
                href="/dashboard/stock/counts"
              />
            }
          />

          <Card padding={5}>
            <Grid columns={{minWidth: 180, max: 3}} gap={4}>
              <Stack gap={1}>
                <Text type="label" color="secondary">
                  {t("columns.status")}
                </Text>
                <HStack gap={2}>
                  <Badge
                    label={tStatuses(count.status)}
                    variant={
                      count.status === "POSTED"
                        ? "success"
                        : count.status === "CANCELLED"
                          ? "neutral"
                          : "warning"
                    }
                  />
                </HStack>
              </Stack>
              <Definition
                label={t("columns.site")}
                value={count.siteName}
              />
              <Definition
                label={t("columns.date")}
                value={formatBusinessDate(count.countedAt, {locale})}
              />
              <Definition
                label={t("detail.note")}
                value={count.note ?? t("detail.noNote")}
              />
            </Grid>
          </Card>

          <StockCountDetail
            count={count}
            canCount={view.canCount}
            canPost={view.canPost}
          />
        </Stack>
      </Center>
    </Section>
  );
}
