import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {HStack} from "@astryxdesign/core/HStack";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {ListToolbar} from "@/components/list/list-toolbar";
import {ListPagination} from "@/components/list-pagination";
import {OrderManager} from "@/components/sales/order-manager";
import type {OrderStatusName} from "@/lib/dto";
import {can} from "@/lib/permissions";
import {requirePermission} from "@/server/auth/actor";
import {orderService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

const ORDER_STATUSES: OrderStatusName[] = [
  "DRAFT",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sales");

  return {title: t("metadataTitle")};
}

type SalesSearchParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SalesPage({searchParams}: SalesSearchParams) {
  const actor = await requirePermission("order:read");
  const [t, tFilters, params] = await Promise.all([
    getTranslations("Sales"),
    getTranslations("Sales.filters"),
    searchParams,
  ]);
  const [view, options] = await Promise.all([
    orderService.getOrders(actor, params),
    orderService.getOptions(actor),
  ]);

  const paginationParams: Record<string, string> = {};
  if (view.filters.search) paginationParams.search = view.filters.search;
  if (view.filters.status) paginationParams.status = view.filters.status;

  return (
    <PageShell
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
    >
      <ListToolbar
        search={{
          value: view.filters.search,
          label: tFilters("search"),
          placeholder: tFilters("searchPlaceholder"),
        }}
        filters={[
          {
            key: "status",
            label: tFilters("status"),
            value: view.filters.status ?? "",
            allLabel: tFilters("allStatuses"),
            options: ORDER_STATUSES.map((status) => ({
              value: status,
              label: t(`statuses.${status}`),
            })),
          },
        ]}
        summary={t("count", {count: view.page.total})}
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
        searchParams={paginationParams}
        label={t("paginationLabel")}
      />
    </PageShell>
  );
}
