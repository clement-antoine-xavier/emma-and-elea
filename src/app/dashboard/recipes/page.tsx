import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {RecipeManager} from "@/components/recipes/recipe-manager";
import {requirePermission} from "@/server/auth/actor";
import {recipeService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Recipes");

  return {title: t("metadataTitle")};
}

export default async function RecipesPage() {
  const actor = await requirePermission("recipe:read");
  const t = await getTranslations("Recipes");
  const [view, options] = await Promise.all([
    recipeService.getRecipes(actor),
    recipeService.getOptions(actor),
  ]);

  return (
    <PageShell title={t("title")} intro={t("intro")}>
      <RecipeManager
        recipes={view.recipes}
        outputItems={options.outputItems}
        canWrite={view.canWrite}
      />
    </PageShell>
  );
}
