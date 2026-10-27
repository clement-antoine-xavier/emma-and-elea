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

export default async function DispatchDetailPage({params}: DispatchParams) {
  const {id} = await params;
  const actor = await requirePermission("dispatch:read");
  const view = await dispatchService.getDispatch(actor, id);

  if (!view) notFound();

  const [options, settings, tStatuses, locale] = await Promise.all([
    dispatchService.getOptions(actor),
    settingsService.getSettings(actor),
    getTranslations("Sales.statuses"),
    getLocale(),
  ]);
  const tPage = await getTranslations("Sales.dispatchPage");

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
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
          />

          <Card padding={5}>
            <Grid columns={{minWidth: 180, max: 3}} gap={4}>
              <Stack gap={1}>
                <Text type="label" color="secondary">
                  {tPage("status")}
                </Text>
                <HStack gap={2}>
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
                </HStack>
              </Stack>
              <Definition
                label={tPage("order")}
                value={view.dispatch.orderNumber ?? tPage("noOrder")}
              />
              <Definition
                label={tPage("carrier")}
                value={view.dispatch.carrier ?? tPage("noCarrier")}
              />
              <Definition
                label={tPage("dispatchedAt")}
                value={
                  view.dispatch.dispatchedAt
                    ? formatBusinessDate(view.dispatch.dispatchedAt, {locale})
                    : tPage("notDispatched")
                }
              />
              <Definition
                label={tPage("note")}
                value={view.dispatch.note ?? tPage("noNote")}
              />
            </Grid>
          </Card>

          <DispatchDetail
            dispatch={view.dispatch}
            lots={options.lots}
            currency={settings.settings.currency}
            canWrite={view.canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
