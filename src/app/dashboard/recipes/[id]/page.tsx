import type {Metadata} from "next";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {ArchiveRecipeButton} from "@/components/recipes/archive-recipe-button";
import {NewRecipeVersionButton} from "@/components/recipes/new-recipe-version-button";
import {RecipeVersionTable} from "@/components/recipes/recipe-version-table";
import {requirePermission} from "@/server/auth/actor";
import {recipeService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type RecipeParams = {params: Promise<{id: string}>};

export async function generateMetadata({
  params,
}: RecipeParams): Promise<Metadata> {
  const {id} = await params;
  const actor = await requirePermission("recipe:read");
  const view = await recipeService.getRecipe(actor, id);
  const t = await getTranslations("Recipes");

  return {
    title: view ? `${view.recipe.name} · ${t("title")}` : t("metadataTitle"),
  };
}

function Definition({label, value}: {label: string; value: string}) {
  return (
    <Stack gap={1}>
      <Text type="label" color="secondary">
        {label}
      </Text>
      <Text>{value}</Text>
    </Stack>
  );
}

export default async function RecipeDetailPage({params}: RecipeParams) {
  const {id} = await params;
  const actor = await requirePermission("recipe:read");
  const view = await recipeService.getRecipe(actor, id);

  if (!view) notFound();

  const t = await getTranslations("Recipes");

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={view.recipe.name}
            intro={`${view.recipe.code} · ${view.recipe.outputItemName}`}
            actions={
              <HStack gap={2} wrap="wrap">
                <Button
                  label={t("backToRecipes")}
                  variant="secondary"
                  href="/dashboard/recipes"
                />
                {view.canWrite ? (
                  <ArchiveRecipeButton
                    recipeId={view.recipe.id}
                    recipeName={view.recipe.name}
                  />
                ) : null}
                {view.canWrite ? (
                  <NewRecipeVersionButton
                    recipeId={view.recipe.id}
                    sourceVersionId={
                      view.recipe.currentVersionId ??
                      view.recipe.versions[0]?.id ??
                      null
                    }
                  />
                ) : null}
              </HStack>
            }
          />

          {view.recipe.isArchived ? (
            <Banner
              status="warning"
              title={t("archivedTitle")}
              description={t("archivedBody")}
            />
          ) : null}

          <Card padding={5}>
            <Grid columns={{minWidth: 180, max: 3}} gap={4}>
              <Definition
                label={t("fields.outputItem")}
                value={view.recipe.outputItemName}
              />
              <Definition label={t("fields.code")} value={view.recipe.code} />
              <Definition
                label={t("fields.description")}
                value={view.recipe.description ?? "—"}
              />
              <Definition
                label={t("currentVersion")}
                value={
                  view.recipe.currentVersionId
                    ? `v${
                        view.recipe.versions.find(
                          (version) =>
                            version.id === view.recipe.currentVersionId,
                        )?.versionNumber ?? "—"
                      }`
                    : t("noCurrentVersion")
                }
              />
            </Grid>
          </Card>

          <Stack gap={3}>
            <Heading level={2}>{t("versionsTitle")}</Heading>
            <Text type="supporting">{t("versionsIntro")}</Text>
            <RecipeVersionTable
              versions={view.recipe.versions}
              recipeId={view.recipe.id}
            />
          </Stack>
        </Stack>
      </Center>
    </Section>
  );
}
