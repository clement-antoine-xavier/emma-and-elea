import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
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
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={760} width="100%">
          <PageHeader
            title={t("newReceipt")}
            actions={
              <Button
                label={t("backToReceipts")}
                variant="secondary"
                href="/dashboard/purchasing"
              />
            }
          />
          <ReceiptForm options={options} />
        </Stack>
      </Center>
    </Section>
  );
}
