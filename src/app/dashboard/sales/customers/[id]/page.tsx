import type {Metadata} from "next";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {PropertyList} from "@/components/layout/property-list";
import {CustomerEditForm} from "@/components/sales/customer-edit-form";
import {requirePermission} from "@/server/auth/actor";
import {customerService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type CustomerParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: CustomerParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("customer:read");
  const view = await customerService.getCustomer(actor, id);
  const t = await getTranslations("Sales.customers");

  return {
    title: view
      ? `${view.customer.name} · ${t("pageTitle")}`
      : t("pageMetadataTitle"),
  };
}

export default async function CustomerDetailPage({params}: CustomerParams) {
  const {id} = await params;
  const actor = await requirePermission("customer:read");
  const view = await customerService.getCustomer(actor, id);

  if (!view) notFound();

  const t = await getTranslations("Sales.customers");
  const tTypes = await getTranslations("Sales.types");
  const tPage = await getTranslations("Sales.customerPage");
  const customer = view.customer;

  const facts = [
    {label: t("fields.type"), value: tTypes(customer.type)},
    {
      label: t("fields.contactName"),
      value: customer.contactName ?? "—",
    },
    {label: t("fields.email"), value: customer.email ?? "—"},
    {label: t("fields.phone"), value: customer.phone ?? "—"},
    {label: t("fields.city"), value: customer.city ?? "—"},
    {label: t("fields.vatNumber"), value: customer.vatNumber ?? "—"},
    {label: t("fields.note"), value: customer.note ?? "—"},
  ];

  return (
    <PageShell
      title={customer.name}
      intro={customer.code ?? tPage("noCode")}
      actions={
        <Button
          label={tPage("back")}
          variant="secondary"
          href="/dashboard/sales/customers"
        />
      }
      contentWidth={1080}
    >
      {customer.isArchived ? (
        <Banner
          status="warning"
          title={tPage("archivedTitle")}
          description={tPage("archivedBody")}
        />
      ) : null}

      <DetailShell
        asideLabel={t("fields.type")}
        aside={
          <Card padding={5}>
            <PropertyList
              columns="single"
              labelPosition="start"
              items={[
                {
                  label: t("fields.type"),
                  value: tTypes(customer.type),
                },
                ...facts.slice(1, 4),
              ]}
            />
          </Card>
        }
      >
        {view.canWrite ? (
          <CustomerEditForm customer={customer} />
        ) : (
          <Card padding={5}>
            <PropertyList items={facts} />
          </Card>
        )}
      </DetailShell>
    </PageShell>
  );
}
