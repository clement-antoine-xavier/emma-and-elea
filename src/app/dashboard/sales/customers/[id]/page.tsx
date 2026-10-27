import type {Metadata} from "next";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
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

export default async function CustomerDetailPage({params}: CustomerParams) {
  const {id} = await params;
  const actor = await requirePermission("customer:read");
  const view = await customerService.getCustomer(actor, id);

  if (!view) notFound();

  const t = await getTranslations("Sales.customers");
  const tTypes = await getTranslations("Sales.types");
  const tPage = await getTranslations("Sales.customerPage");
  const customer = view.customer;

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={customer.name}
            intro={customer.code ?? tPage("noCode")}
            actions={
              <Button
                label={tPage("back")}
                variant="secondary"
                href="/dashboard/sales/customers"
              />
            }
          />

          {customer.isArchived ? (
            <Banner
              status="warning"
              title={tPage("archivedTitle")}
              description={tPage("archivedBody")}
            />
          ) : null}

          {view.canWrite ? (
            <CustomerEditForm customer={customer} />
          ) : (
            <Card padding={5}>
              <Grid columns={{minWidth: 180, max: 3}} gap={4}>
                <Definition label={t("fields.type")} value={tTypes(customer.type)} />
                <Definition
                  label={t("fields.contactName")}
                  value={customer.contactName ?? "—"}
                />
                <Definition
                  label={t("fields.email")}
                  value={customer.email ?? "—"}
                />
                <Definition
                  label={t("fields.phone")}
                  value={customer.phone ?? "—"}
                />
                <Definition
                  label={t("fields.city")}
                  value={customer.city ?? "—"}
                />
                <Definition
                  label={t("fields.vatNumber")}
                  value={customer.vatNumber ?? "—"}
                />
                <Definition
                  label={t("fields.note")}
                  value={customer.note ?? "—"}
                />
              </Grid>
            </Card>
          )}
        </Stack>
      </Center>
    </Section>
  );
}
