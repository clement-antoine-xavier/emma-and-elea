"use client";

import {useState} from "react";
import {AlertDialog} from "@astryxdesign/core/AlertDialog";
import {Button} from "@astryxdesign/core/Button";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {archiveItemAction} from "@/app/actions/catalog.actions";

export function ArchiveItemButton({
  itemId,
  itemName,
}: {
  itemId: string;
  itemName: string;
}) {
  const t = useTranslations("Catalog.detail");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function archive() {
    setIsLoading(true);
    const result = await archiveItemAction({id: itemId});
    setIsLoading(false);

    if (!result.ok) return;

    setIsOpen(false);
    router.push("/dashboard/catalog");
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
        title={t("archiveTitle", {name: itemName})}
        description={t("archiveBody")}
        actionLabel={t("archiveConfirm")}
        cancelLabel={t("archiveCancel")}
        isActionLoading={isLoading}
        onAction={archive}
      />
    </>
  );
}
