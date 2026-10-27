"use client";

import {useState} from "react";
import {AlertDialog} from "@astryxdesign/core/AlertDialog";
import {Button} from "@astryxdesign/core/Button";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {archiveSupplierAction} from "@/app/actions/supplier.actions";

export function ArchiveSupplierButton({
  supplierId,
  supplierName,
}: {
  supplierId: string;
  supplierName: string;
}) {
  const t = useTranslations("Suppliers");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function archive() {
    setIsLoading(true);
    const result = await archiveSupplierAction({id: supplierId});
    setIsLoading(false);

    if (!result.ok) return;

    setIsOpen(false);
    router.push("/dashboard/purchasing/suppliers");
    router.refresh();
  }

  return (
    <>
      <Button
        label={t("archive")}
        variant="secondary"
        onClick={() => setIsOpen(true)}
      />
      <AlertDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t("archiveTitle", {name: supplierName})}
        description={t("archiveBody")}
        actionLabel={t("archiveConfirm")}
        cancelLabel={t("cancel")}
        isActionLoading={isLoading}
        onAction={archive}
      />
    </>
  );
}
