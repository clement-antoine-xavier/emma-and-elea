import type {Metadata} from "next";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {PropertyList} from "@/components/layout/property-list";
import {CostBreakdown} from "@/components/recipes/cost-breakdown";
import {PriceSimulator} from "@/components/recipes/price-simulator";
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
    <PageShell
      title={`${view.version.recipeName} · v${view.version.versionNumber}`}
      intro={`${view.version.recipeCode} · ${t(`statuses.${view.version.status}`)}`}
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
      contentWidth={1280}
    >
      <DetailShell
        asideLabel={tVersion("fields.yieldQuantity")}
        aside={
          <Card padding={5}>
            <PropertyList
              columns="single"
              labelPosition="start"
              items={[
                {
                  label: tVersion("fields.yieldQuantity"),
                  value: `${view.version.yieldQuantity} ${view.version.yieldUnitCode}`,
                },
                {
                  label: tVersion("fields.portionCount"),
                  value:
                    view.version.portionCount === null
                      ? "—"
                      : String(view.version.portionCount),
                },
                {
                  label: tVersion("fields.prepMinutes"),
                  value:
                    view.version.prepMinutes === null
                      ? "—"
                      : String(view.version.prepMinutes),
                },
                {
                  label: tVersion("fields.cookMinutes"),
                  value:
                    view.version.cookMinutes === null
                      ? "—"
                      : String(view.version.cookMinutes),
                },
                {
                  label: tVersion("fields.changeNote"),
                  value: view.version.changeNote ?? "—",
                },
                {
                  label: tVersion("fields.instructions"),
                  value: view.version.instructions ?? "—",
                },
              ]}
            />
          </Card>
        }
      >
        <Stack gap={6}>
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
          ) : null}

          {view.canReadCost && view.version.cost ? (
            <CostBreakdown
              cost={view.version.cost}
              versionId={view.version.id}
              canRefresh={view.version.status !== "DRAFT"}
            />
          ) : null}

          {view.canReadCost ? (
            <PriceSimulator
              versionId={view.version.id}
              salePrice={view.version.salePrice}
              canSimulate={view.canReadCost}
            />
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
      </DetailShell>
    </PageShell>
  );
}
