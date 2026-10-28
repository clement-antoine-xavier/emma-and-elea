import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
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
    <PageShell
      title={t("pageTitle")}
      intro={t("pageIntro")}
      actions={
        <Button
          label={t("backToSales")}
          variant="secondary"
          href="/dashboard/sales"
        />
      }
    >
      <CustomerManager customers={customers} canWrite={canWrite} />
    </PageShell>
  );
}
