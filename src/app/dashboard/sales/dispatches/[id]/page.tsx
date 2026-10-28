import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {notFound} from "next/navigation";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {PropertyList} from "@/components/layout/property-list";
import {DispatchDetail} from "@/components/sales/dispatch-detail";
import {formatBusinessDate} from "@/lib/format";
import {requirePermission} from "@/server/auth/actor";
import {
  dispatchService,
  settingsService,
} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type DispatchParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: DispatchParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("dispatch:read");
  const view = await dispatchService.getDispatch(actor, id);
  const t = await getTranslations("Sales.dispatches");

  return {
    title: view
      ? `${view.dispatch.number} · ${t("pageTitle")}`
      : t("pageMetadataTitle"),
  };
}

export default async function DispatchDetailPage({params}: DispatchParams) {
  const {id} = await params;
  const actor = await requirePermission("dispatch:read");
  const view = await dispatchService.getDispatch(actor, id);

  if (!view) notFound();

  const [options, settings, tStatuses, locale, tPage] = await Promise.all([
    dispatchService.getOptions(actor),
    settingsService.getSettings(actor),
    getTranslations("Sales.statuses"),
    getLocale(),
    getTranslations("Sales.dispatchPage"),
  ]);

  return (
    <PageShell
      title={view.dispatch.number}
      intro={
        view.dispatch.customerName
          ? `${view.dispatch.customerName} · ${view.dispatch.siteName}`
          : view.dispatch.siteName
      }
      actions={
        <Button
          label={tPage("back")}
          variant="secondary"
          href="/dashboard/sales/dispatches"
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
                      label={tStatuses(view.dispatch.status)}
                      variant={
                        view.dispatch.status === "DISPATCHED"
                          ? "success"
                          : view.dispatch.status === "CANCELLED"
                            ? "neutral"
                            : "warning"
                      }
                    />
                  ),
                },
                {
                  label: tPage("order"),
                  value: view.dispatch.orderNumber ?? tPage("noOrder"),
                },
                {
                  label: tPage("carrier"),
                  value: view.dispatch.carrier ?? tPage("noCarrier"),
                },
                {
                  label: tPage("dispatchedAt"),
                  value: view.dispatch.dispatchedAt
                    ? formatBusinessDate(view.dispatch.dispatchedAt, {
                        locale,
                      })
                    : tPage("notDispatched"),
                },
                {
                  label: tPage("note"),
                  value: view.dispatch.note ?? tPage("noNote"),
                },
              ]}
            />
          </Card>
        }
      >
        <DispatchDetail
          dispatch={view.dispatch}
          lots={options.lots}
          currency={settings.settings.currency}
          canWrite={view.canWrite}
        />
      </DetailShell>
    </PageShell>
  );
}
