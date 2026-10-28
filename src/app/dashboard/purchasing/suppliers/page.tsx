import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {SupplierManager} from "@/components/purchasing/supplier-manager";
import {requirePermission} from "@/server/auth/actor";
import {supplierService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Suppliers");

  return {title: t("metadataTitle")};
}

export default async function SuppliersPage() {
  const actor = await requirePermission("supplier:read");
  const t = await getTranslations("Suppliers");
  const tPurchasing = await getTranslations("Purchasing");
  const {suppliers, canWrite} = await supplierService.getSuppliers(actor);

  return (
    <PageShell
      title={t("title")}
      intro={t("intro", {organization: actor.organization.name})}
      actions={
        <Button
          label={tPurchasing("backToReceipts")}
          variant="secondary"
          href="/dashboard/purchasing"
        />
      }
    >
      <SupplierManager suppliers={suppliers} canWrite={canWrite} />
    </PageShell>
  );
}
