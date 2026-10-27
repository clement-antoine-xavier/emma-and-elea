import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {CustomerManager} from "@/components/sales/customer-manager";
import {requirePermission} from "@/server/auth/actor";
import {customerService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sales.customers");

  return {title: t("pageMetadataTitle")};
}

export default async function CustomersPage() {
  const actor = await requirePermission("customer:read");
  const t = await getTranslations("Sales.customers");
  const {customers, canWrite} = await customerService.getCustomers(actor);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={t("pageTitle")}
            intro={t("pageIntro")}
            actions={
              <Button
                label={t("backToSales")}
                variant="secondary"
                href="/dashboard/sales"
              />
            }
          />
          <CustomerManager customers={customers} canWrite={canWrite} />
        </Stack>
      </Center>
    </Section>
  );
}
