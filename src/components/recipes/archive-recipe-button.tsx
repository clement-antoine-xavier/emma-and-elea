"use client";

import {useState} from "react";
import {AlertDialog} from "@astryxdesign/core/AlertDialog";
import {Button} from "@astryxdesign/core/Button";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {archiveRecipeAction} from "@/app/actions/recipe.actions";

export function ArchiveRecipeButton({
  recipeId,
  recipeName,
}: {
  recipeId: string;
  recipeName: string;
}) {
  const t = useTranslations("Recipes");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function archive() {
    setIsLoading(true);
    const result = await archiveRecipeAction({id: recipeId});
    setIsLoading(false);

    if (!result.ok) return;

    setIsOpen(false);
    router.push("/dashboard/recipes");
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
        title={t("archiveTitle", {name: recipeName})}
        description={t("archiveBody")}
        actionLabel={t("archiveConfirm")}
        cancelLabel={t("cancel")}
        isActionLoading={isLoading}
        onAction={archive}
      />
    </>
  );
}
