import type {Metadata} from "next";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";

/**
 * The areas that are wired but not built yet. M1 onward replaces each
 * placeholder with its real screen; the route, permission guard and navigation
 * entry already exist, so the milestone only swaps the body.
 */
export type WorkspaceArea =
  | "catalog"
  | "recipes"
  | "production"
  | "stock"
  | "purchasing"
  | "sales"
  | "reports"
  | "settings";

export async function workspaceMetadata(
  area: WorkspaceArea,
): Promise<Metadata> {
  const t = await getTranslations("Workspace");
  const tPage = await getTranslations(`Workspace.pages.${area}`);

  return {title: t("metadataTitle", {area: tPage("title")})};
}

export async function WorkspacePage({area}: {area: WorkspaceArea}) {
  const t = await getTranslations("Workspace");
  const tPage = await getTranslations(`Workspace.pages.${area}`);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader title={tPage("title")} intro={tPage("intro")} />
          <Card padding={6}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
            />
          </Card>
        </Stack>
      </Center>
    </Section>
  );
}
