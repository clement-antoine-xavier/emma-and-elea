import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {ListPagination} from "@/components/list-pagination";
import {OrderManager} from "@/components/sales/order-manager";
import {can} from "@/lib/permissions";
import {requirePermission} from "@/server/auth/actor";
import {orderService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sales");

  return {title: t("metadataTitle")};
}

type SalesSearchParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SalesPage({searchParams}: SalesSearchParams) {
  const actor = await requirePermission("order:read");
  const t = await getTranslations("Sales");
  const params = await searchParams;
  const [view, options] = await Promise.all([
    orderService.getOrders(actor, params),
    orderService.getOptions(actor),
  ]);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={t("title")}
            intro={t("intro")}
            actions={
              <HStack gap={2} wrap="wrap">
                {can(actor.role, "customer:read") ? (
                  <Button
                    label={t("links.customers")}
                    variant="secondary"
                    href="/dashboard/sales/customers"
                  />
                ) : null}
                {can(actor.role, "dispatch:read") ? (
                  <Button
                    label={t("links.dispatches")}
                    variant="secondary"
                    href="/dashboard/sales/dispatches"
                  />
                ) : null}
                {can(actor.role, "sales:read") ? (
                  <Button
                    label={t("links.daily")}
                    variant="secondary"
                    href="/dashboard/sales/daily"
                  />
                ) : null}
              </HStack>
            }
          />

          <OrderManager
            orders={view.page.items}
            options={{
              customers: options.customers,
              sites: options.sites,
            }}
            canWrite={view.canWrite}
          />

          <ListPagination
            page={view.page.page}
            pageSize={view.page.pageSize}
            total={view.page.total}
            searchParams={{}}
            label={t("paginationLabel")}
          />
        </Stack>
      </Center>
    </Section>
  );
}
