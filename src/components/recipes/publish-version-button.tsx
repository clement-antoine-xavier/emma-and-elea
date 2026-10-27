"use client";

import {useState} from "react";
import {AlertDialog} from "@astryxdesign/core/AlertDialog";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Stack} from "@astryxdesign/core/Stack";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {publishRecipeVersionAction} from "@/app/actions/recipe.actions";

export function PublishVersionButton({versionId}: {versionId: string}) {
  const t = useTranslations("Recipes.publish");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setIsLoading(true);
    setError(null);
    const result = await publishRecipeVersionAction({id: versionId});
    setIsLoading(false);
    setIsOpen(false);

    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }

    router.refresh();
  }

  return (
    <Stack gap={2}>
      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}
      <Button
        label={t("action")}
        variant="primary"
        onClick={() => setIsOpen(true)}
      />
      <AlertDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t("title")}
        description={t("body")}
        actionLabel={t("confirm")}
        cancelLabel={t("cancel")}
        isActionLoading={isLoading}
        onAction={publish}
      />
    </Stack>
  );
}
