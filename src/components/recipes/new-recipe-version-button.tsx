"use client";

import {useState} from "react";
import {Button} from "@astryxdesign/core/Button";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {createRecipeVersionAction} from "@/app/actions/recipe.actions";

export function NewRecipeVersionButton({
  recipeId,
  sourceVersionId,
}: {
  recipeId: string;
  sourceVersionId: string | null;
}) {
  const t = useTranslations("Recipes");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function create() {
    setIsLoading(true);
    const result = await createRecipeVersionAction(
      recipeId,
      sourceVersionId,
    );
    setIsLoading(false);

    if (!result.ok || !result.versionId) return;

    router.push(
      `/dashboard/recipes/${recipeId}/versions/${result.versionId}`,
    );
    router.refresh();
  }

  return (
    <Button
      label={t("newVersion")}
      variant="primary"
      isLoading={isLoading}
      onClick={create}
    />
  );
}
