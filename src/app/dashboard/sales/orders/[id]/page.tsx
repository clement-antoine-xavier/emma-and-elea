import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {PropertyList} from "@/components/layout/property-list";
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

export default async function OrderDetailPage({params}: OrderParams) {
  const {id} = await params;
  const actor = await requirePermission("order:read");
  const view = await orderService.getOrder(actor, id);

  if (!view) notFound();

  const [options, tStatuses, locale, tPage] = await Promise.all([
    orderService.getOptions(actor),
    getTranslations("Sales.statuses"),
    getLocale(),
    getTranslations("Sales.orderPage"),
  ]);

  return (
    <PageShell
      title={view.order.number}
      intro={`${view.order.customerName} · ${view.order.siteName}`}
      actions={
        <Button
          label={tPage("back")}
          variant="secondary"
          href="/dashboard/sales"
        />
      }
      contentWidth={1280}
    >
      <DetailShell
        asideLabel={tPage("status")}
        aside={
          <Card padding={5}>
            <PropertyList
              columns="single"
              labelPosition="start"
              items={[
                {
                  label: tPage("status"),
                  value: (
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
                  ),
                },
                {
                  label: tPage("requestedFor"),
                  value: formatBusinessDate(view.order.requestedFor, {
                    locale,
                  }),
                },
                {
                  label: tPage("total"),
                  value: formatMoney(view.order.totalAmount, {
                    locale,
                    currency: view.order.currency,
                  }),
                },
                {
                  label: tPage("note"),
                  value: view.order.note ?? tPage("noNote"),
                },
              ]}
            />
          </Card>
        }
      >
        <OrderDetail
          order={view.order}
          options={{
            items: options.items,
            units: options.units,
          }}
          canWrite={view.canWrite}
        />
      </DetailShell>
    </PageShell>
  );
}
