import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {HStack} from "@astryxdesign/core/HStack";
import {List, ListItem} from "@astryxdesign/core/List";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getLocale, getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {DetailShell} from "@/components/layout/detail-shell";
import {ReplenishmentTable} from "@/components/stock/replenishment-table";
import {StockLevelsTable} from "@/components/stock/stock-levels-table";
import {formatQuantity} from "@/lib/format";
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
  const [t, locale] = await Promise.all([
    getTranslations("Stock"),
    getLocale(),
  ]);
  const [{levels, alerts}, replenishment] = await Promise.all([
    stockService.getLevels(actor),
    stockService.getReplenishment(actor),
  ]);

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      actions={
        <HStack gap={2} wrap="wrap">
          <Button
            label={t("countsLink")}
            variant="secondary"
            href="/dashboard/stock/counts"
          />
          <Button
            label={t("lotsLink")}
            variant="secondary"
            href="/dashboard/stock/lots"
          />
        </HStack>
      }
    >
      <DetailShell
        asideLabel={t("alerts.title")}
        aside={
          alerts.length > 0 ? (
            <Stack gap={4}>
              <Stack gap={1}>
                <Heading level={2}>{t("alerts.title")}</Heading>
                <Text type="supporting">
                  {t("alerts.body", {count: alerts.length})}
                </Text>
              </Stack>
              <List hasDividers density="compact">
                {alerts.slice(0, 8).map((alert) => (
                  <ListItem
                    key={`${alert.siteId}:${alert.itemId}`}
                    label={alert.itemName}
                    description={`${alert.siteName} · ${formatQuantity(
                      alert.quantity,
                      {locale},
                    )} ${alert.unitCode} / ${formatQuantity(
                      alert.minStockQuantity,
                      {locale},
                    )} ${alert.unitCode}`}
                    endContent={
                      <Badge variant="warning" label={t("low")} />
                    }
                  />
                ))}
              </List>
            </Stack>
          ) : (
            <Stack gap={1}>
              <Heading level={2}>{t("alerts.title")}</Heading>
              <Text type="supporting">{t("alerts.none")}</Text>
            </Stack>
          )
        }
      >
        <Stack gap={6}>
          <Stack gap={3}>
            <Stack gap={1}>
              <Heading level={2}>{t("levelsTitle")}</Heading>
              <Text type="supporting">{t("levelsIntro")}</Text>
            </Stack>

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

          <Stack gap={3}>
            <Stack gap={1}>
              <Heading level={2}>{t("replenishment.title")}</Heading>
              <Text type="supporting">{t("replenishment.intro")}</Text>
            </Stack>

            {replenishment.suggestions.length === 0 ? (
              <Card padding={4}>
                <EmptyState
                  title={t("replenishment.emptyTitle")}
                  description={t("replenishment.emptyBody")}
                />
              </Card>
            ) : (
              <ReplenishmentTable
                suggestions={replenishment.suggestions}
                canWrite={replenishment.canWrite}
              />
            )}
          </Stack>
        </Stack>
      </DetailShell>
    </PageShell>
  );
}
