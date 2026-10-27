import type {Metadata} from "next";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
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
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader title={t("title")} intro={t("intro")} />
          <RecipeManager
            recipes={view.recipes}
            outputItems={options.outputItems}
            canWrite={view.canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
