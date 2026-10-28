import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {ReceiptForm} from "@/components/purchasing/receipt-form";
import {requirePermission} from "@/server/auth/actor";
import {purchasingService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Purchasing.form");

  return {title: t("metadataTitle")};
}

export default async function NewReceiptPage() {
  const actor = await requirePermission("purchasing:write");
  const t = await getTranslations("Purchasing");
  const options = await purchasingService.getFormOptions(actor);

  return (
    <PageShell
      title={t("newReceipt")}
      contentWidth={760}
      actions={
        <Button
          label={t("backToReceipts")}
          variant="secondary"
          href="/dashboard/purchasing"
        />
      }
    >
      <ReceiptForm options={options} />
    </PageShell>
  );
}
