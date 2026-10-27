import type {Metadata} from "next";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {StockLevelsTable} from "@/components/stock/stock-levels-table";
import {requirePermission} from "@/server/auth/actor";
import {stockService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Stock");

  return {title: t("metadataTitle")};
}

export default async function StockPage() {
  const actor = await requirePermission("stock:read");
  const t = await getTranslations("Stock");
  const {levels, alerts} = await stockService.getLevels(actor);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader
            title={t("title")}
            intro={t("intro")}
            actions={
              <Button
                label={t("lotsLink")}
                variant="secondary"
                href="/dashboard/stock/lots"
              />
            }
          />

          {alerts.length > 0 ? (
            <Banner
              status="warning"
              title={t("alerts.title")}
              description={t("alerts.body", {count: alerts.length})}
            />
          ) : null}

          <Stack gap={3}>
            <Heading level={2}>{t("levelsTitle")}</Heading>
            <Text type="supporting">{t("levelsIntro")}</Text>

            {levels.length === 0 ? (
              <Card padding={4}>
                <EmptyState
                  title={t("emptyTitle")}
                  description={t("emptyBody")}
                />
              </Card>
            ) : (
              <StockLevelsTable levels={levels} />
            )}
          </Stack>
        </Stack>
      </Center>
    </Section>
  );
}
