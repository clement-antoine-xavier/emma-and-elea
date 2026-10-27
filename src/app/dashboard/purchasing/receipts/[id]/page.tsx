import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {ReceiptDetail} from "@/components/purchasing/receipt-detail";
import {requirePermission} from "@/server/auth/actor";
import {purchasingService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type ReceiptParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: ReceiptParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("purchasing:read");
  const view = await purchasingService.getReceipt(actor, id);
  const t = await getTranslations("Purchasing");

  return {title: view ? `${view.receipt.number} · ${t("title")}` : t("metadataTitle")};
}

export default async function ReceiptDetailPage({params}: ReceiptParams) {
  const {id} = await params;
  const actor = await requirePermission("purchasing:read");
  const view = await purchasingService.getReceipt(actor, id);

  if (!view) notFound();

  const t = await getTranslations("Purchasing");
  const tStatuses = await getTranslations("Purchasing.statuses");
  const options = await purchasingService.getFormOptions(actor);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={view.receipt.number}
            intro={`${view.receipt.supplierName} · ${view.receipt.siteName}`}
            actions={
              <HStack gap={2} wrap="wrap">
                <Badge
                  label={tStatuses(view.receipt.status)}
                  variant={
                    view.receipt.status === "POSTED"
                      ? "success"
                      : view.receipt.status === "CANCELLED"
                        ? "neutral"
                        : "warning"
                  }
                />
                <Button
                  label={t("backToReceipts")}
                  variant="secondary"
                  href="/dashboard/purchasing"
                />
              </HStack>
            }
          />
          <ReceiptDetail
            receipt={view.receipt}
            items={options.items}
            units={options.units}
            canWrite={view.canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
