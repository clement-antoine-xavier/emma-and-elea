import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {PropertyList} from "@/components/layout/property-list";
import {ReceiptDetail} from "@/components/purchasing/receipt-detail";
import {formatBusinessDate, formatMoney} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {purchasingService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type ReceiptParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: ReceiptParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("purchasing:read");
  const view = await purchasingService.getReceipt(actor, id);
  const t = await getTranslations("Purchasing");

  return {
    title: view
      ? `${view.receipt.number} · ${t("title")}`
      : t("metadataTitle"),
  };
}

export default async function ReceiptDetailPage({params}: ReceiptParams) {
  const {id} = await params;
  const actor = await requirePermission("purchasing:read");
  const view = await purchasingService.getReceipt(actor, id);

  if (!view) notFound();

  const [options, t, tStatuses, tDetail, locale] = await Promise.all([
    purchasingService.getFormOptions(actor),
    getTranslations("Purchasing"),
    getTranslations("Purchasing.statuses"),
    getTranslations("Purchasing.detail"),
    getLocale(),
  ]);

  return (
    <PageShell
      title={view.receipt.number}
      intro={`${view.receipt.supplierName} · ${view.receipt.siteName}`}
      actions={
        <Button
          label={t("backToReceipts")}
          variant="secondary"
          href="/dashboard/purchasing"
        />
      }
      contentWidth={1280}
    >
      <DetailShell
        asideLabel={tDetail("linesTitle")}
        aside={
          <Card padding={5}>
            <PropertyList
              columns="single"
              labelPosition="start"
              items={[
                {
                  label: tDetail("linesTitle"),
                  value: (
                    <Badge
                      label={tStatuses(view.receipt.status)}
                      variant={
                        view.receipt.status === "POSTED"
                          ? "success"
                          : view.receipt.status === "CANCELLED"
                            ? "neutral"
                            : "warning"
                      }
                    />
                  ),
                },
                {
                  label: tDetail("supplier"),
                  value: view.receipt.supplierName,
                },
                {label: tDetail("site"), value: view.receipt.siteName},
                {
                  label: tDetail("reference"),
                  value: view.receipt.supplierReference ?? "—",
                },
                {
                  label: tDetail("receivedAt"),
                  value: view.receipt.receivedAt
                    ? formatBusinessDate(view.receipt.receivedAt, {locale})
                    : "—",
                },
                {
                  label: tDetail("total"),
                  value: formatMoney(view.receipt.totalAmount, {
                    locale,
                    currency: view.receipt.currency,
                  }),
                },
              ]}
            />
          </Card>
        }
      >
        <ReceiptDetail
          receipt={view.receipt}
          items={options.items}
          units={options.units}
          canWrite={view.canWrite}
        />
      </DetailShell>
    </PageShell>
  );
}
