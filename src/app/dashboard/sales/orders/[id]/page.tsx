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
import {OrderDetail} from "@/components/sales/order-detail";
import {formatBusinessDate, formatMoney} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {orderService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type OrderParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: OrderParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("order:read");
  const view = await orderService.getOrder(actor, id);
  const t = await getTranslations("Sales");

  return {
    title: view ? `${view.order.number} · ${t("title")}` : t("metadataTitle"),
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

export default async function OrderDetailPage({params}: OrderParams) {
  const {id} = await params;
  const actor = await requirePermission("order:read");
  const view = await orderService.getOrder(actor, id);

  if (!view) notFound();

  const [options, tStatuses, locale] = await Promise.all([
    orderService.getOptions(actor),
    getTranslations("Sales.statuses"),
    getLocale(),
  ]);
  const tPage = await getTranslations("Sales.orderPage");

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={view.order.number}
            intro={`${view.order.customerName} · ${view.order.siteName}`}
            actions={
              <Button
                label={tPage("back")}
                variant="secondary"
                href="/dashboard/sales"
              />
            }
          />

          <Card padding={5}>
            <Grid columns={{minWidth: 180, max: 3}} gap={4}>
              <Stack gap={1}>
                <Text type="label" color="secondary">
                  {tPage("status")}
                </Text>
                <HStack gap={2}>
                  <Badge
                    label={tStatuses(view.order.status)}
                    variant={
                      view.order.status === "DELIVERED"
                        ? "success"
                        : view.order.status === "CANCELLED"
                          ? "neutral"
                          : "warning"
                    }
                  />
                </HStack>
              </Stack>
              <Definition
                label={tPage("requestedFor")}
                value={formatBusinessDate(view.order.requestedFor, {locale})}
              />
              <Definition
                label={tPage("total")}
                value={formatMoney(view.order.totalAmount, {
                  locale,
                  currency: view.order.currency,
                })}
              />
              <Definition
                label={tPage("note")}
                value={view.order.note ?? tPage("noNote")}
              />
            </Grid>
          </Card>

          <OrderDetail
            order={view.order}
            options={{
              items: options.items,
              units: options.units,
            }}
            canWrite={view.canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
