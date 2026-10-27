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
import {CostBreakdown} from "@/components/recipes/cost-breakdown";
import {PublishVersionButton} from "@/components/recipes/publish-version-button";
import {RecipeLinesManager} from "@/components/recipes/recipe-lines-manager";
import {RecipeOperationsManager} from "@/components/recipes/recipe-operations-manager";
import {RecipeVersionForm} from "@/components/recipes/recipe-version-form";
import {requirePermission} from "@/server/auth/actor";
import {recipeService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

type VersionParams = {
  params: Promise<{id: string; versionId: string}>;
};

export async function generateMetadata({
  params,
}: VersionParams): Promise<Metadata> {
  const {versionId} = await params;
  const actor = await requirePermission("recipe:read");
  const view = await recipeService.getVersion(actor, versionId);
  const t = await getTranslations("Recipes");

  return {
    title: view
      ? `${view.version.recipeName} v${view.version.versionNumber} · ${t("title")}`
      : t("metadataTitle"),
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

export default async function RecipeVersionPage({params}: VersionParams) {
  const {id, versionId} = await params;
  const actor = await requirePermission("recipe:read");
  const view = await recipeService.getVersion(actor, versionId);

  if (!view) notFound();

  const t = await getTranslations("Recipes");
  const tVersion = await getTranslations("Recipes.versionForm");
  const options = await recipeService.getOptions(actor);
  const isDraft = view.version.status === "DRAFT";
  const canEdit = view.canWrite && isDraft;

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={`${view.version.recipeName} · v${view.version.versionNumber}`}
            intro={`${view.version.recipeCode} · ${t(
              `statuses.${view.version.status}`,
            )}`}
            actions={
              <HStack gap={2} wrap="wrap">
                <Button
                  label={t("backToRecipe")}
                  variant="secondary"
                  href={`/dashboard/recipes/${id}`}
                />
                {isDraft && view.canPublish ? (
                  <PublishVersionButton versionId={view.version.id} />
                ) : null}
              </HStack>
            }
          />

          {view.version.status === "PUBLISHED" ? (
            <Banner
              status="success"
              title={t("publishedTitle")}
              description={t("publishedBody")}
            />
          ) : null}

          {canEdit ? (
            <RecipeVersionForm
              version={view.version}
              units={options.units}
            />
          ) : (
            <Card padding={5}>
              <Grid columns={{minWidth: 180, max: 3}} gap={4}>
                <Definition
                  label={tVersion("fields.yieldQuantity")}
                  value={`${view.version.yieldQuantity} ${view.version.yieldUnitCode}`}
                />
                <Definition
                  label={tVersion("fields.portionCount")}
                  value={
                    view.version.portionCount === null
                      ? "—"
                      : String(view.version.portionCount)
                  }
                />
                <Definition
                  label={tVersion("fields.prepMinutes")}
                  value={
                    view.version.prepMinutes === null
                      ? "—"
                      : String(view.version.prepMinutes)
                  }
                />
                <Definition
                  label={tVersion("fields.cookMinutes")}
                  value={
                    view.version.cookMinutes === null
                      ? "—"
                      : String(view.version.cookMinutes)
                  }
                />
                <Definition
                  label={tVersion("fields.changeNote")}
                  value={view.version.changeNote ?? "—"}
                />
                <Definition
                  label={tVersion("fields.instructions")}
                  value={view.version.instructions ?? "—"}
                />
              </Grid>
            </Card>
          )}

          {view.canReadCost && view.version.cost ? (
            <CostBreakdown cost={view.version.cost} />
          ) : null}

          <RecipeLinesManager
            versionId={view.version.id}
            lines={view.version.lines}
            items={options.lineItems}
            units={options.units}
            canWrite={canEdit}
          />

          <RecipeOperationsManager
            versionId={view.version.id}
            operations={view.version.operations}
            equipment={options.equipment}
            labourRates={options.labourRates}
            canWrite={canEdit}
          />

          {isDraft ? (
            <Stack gap={1}>
              <Heading level={2}>{t("publishHintTitle")}</Heading>
              <Text type="supporting">{t("publishHintBody")}</Text>
            </Stack>
          ) : null}
        </Stack>
      </Center>
    </Section>
  );
}
