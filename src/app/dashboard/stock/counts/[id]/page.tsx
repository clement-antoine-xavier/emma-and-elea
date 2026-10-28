import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {PropertyList} from "@/components/layout/property-list";
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
    <PageShell
      title={t("detailTitle")}
      intro={`${formatBusinessDate(count.countedAt, {locale})} · ${count.siteName}`}
      actions={
        <Button
          label={t("back")}
          variant="secondary"
          href="/dashboard/stock/counts"
        />
      }
      contentWidth={1280}
    >
      <DetailShell
        asideLabel={t("columns.status")}
        aside={
          <Card padding={5}>
            <PropertyList
              columns="single"
              labelPosition="start"
              items={[
                {
                  label: t("columns.status"),
                  value: (
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
                  ),
                },
                {label: t("columns.site"), value: count.siteName},
                {
                  label: t("columns.date"),
                  value: formatBusinessDate(count.countedAt, {locale}),
                },
                {
                  label: t("detail.note"),
                  value: count.note ?? t("detail.noNote"),
                },
              ]}
            />
          </Card>
        }
      >
        <StockCountDetail
          count={count}
          canCount={view.canCount}
          canPost={view.canPost}
        />
      </DetailShell>
    </PageShell>
  );
}
