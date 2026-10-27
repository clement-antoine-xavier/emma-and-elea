import type {Metadata} from "next";
import {Badge} from "@astryxdesign/core/Badge";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getLocale, getTranslations} from "next-intl/server";
import {can} from "@/lib/permissions";
import {formatMoney} from "@/lib/format";
import {requireOrganizationActor} from "@/server/auth/actor";
import {dashboardService, reportService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");

  return {title: t("metadataTitle")};
}

export default async function DashboardPage() {
  const actor = await requireOrganizationActor();
  const t = await getTranslations("Dashboard.overview");
  const tKpis = await getTranslations("Dashboard.kpis");
  const tRoles = await getTranslations("Roles");
  const {areas} = dashboardService.getOverview(actor);
  const canReadReports = can(actor.role, "report:read");
  const [locale, kpis] = await Promise.all([
    getLocale(),
    canReadReports ? reportService.getKpis(actor) : Promise.resolve(null),
  ]);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={8} maxWidth={1120} width="100%">
          <Stack gap={2}>
            <Text type="label" color="accent">
              {t("eyebrow")}
            </Text>
            <Heading level={1} type="display-3">
              {t("title", {name: actor.name})}
            </Heading>
            <Text type="large" color="secondary">
              {t("intro", {
                organization: actor.organization.name,
                role: tRoles(`${actor.role}.label`),
              })}
            </Text>
          </Stack>

          {canReadReports && kpis ? (
            <Stack gap={4}>
              <Stack gap={1}>
                <Heading level={2}>{tKpis("title")}</Heading>
                <Text color="secondary">{tKpis("intro")}</Text>
              </Stack>
              <Grid columns={{minWidth: 220, max: 4}} gap={4}>
                <Card padding={5}>
                  <Stack gap={1}>
                    <Text type="label" color="secondary">
                      {tKpis("batchesToday")}
                    </Text>
                    <Heading level={3}>{kpis.batchesToday}</Heading>
                  </Stack>
                </Card>
                <Card padding={5}>
                  <Stack gap={1}>
                    <Text type="label" color="secondary">
                      {tKpis("lowStock")}
                    </Text>
                    <Heading level={3}>{kpis.lowStockCount}</Heading>
                  </Stack>
                </Card>
                <Card padding={5}>
                  <Stack gap={1}>
                    <Text type="label" color="secondary">
                      {tKpis("expiringLots")}
                    </Text>
                    <Heading level={3}>{kpis.expiringLotsCount}</Heading>
                  </Stack>
                </Card>
                <Card padding={5}>
                  <Stack gap={1}>
                    <Text type="label" color="secondary">
                      {tKpis("waste30d")}
                    </Text>
                    <Heading level={3}>
                      {formatMoney(kpis.wasteCost30d, {
                        locale,
                        currency: kpis.currency,
                      })}
                    </Heading>
                  </Stack>
                </Card>
              </Grid>
            </Stack>
          ) : null}

          <Grid columns={{minWidth: 280, max: 2}} gap={4}>
            <Card padding={5}>
              <Stack gap={3}>
                <Text type="label" color="secondary">
                  {t("roleTitle")}
                </Text>
                <HStack gap={3} align="center" wrap="wrap">
                  <Heading level={2}>
                    {tRoles(`${actor.role}.label`)}
                  </Heading>
                  <Badge
                    label={actor.organization.slug}
                    variant="neutral"
                  />
                </HStack>
                <Text color="secondary">
                  {tRoles(`${actor.role}.description`)}
                </Text>
              </Stack>
            </Card>

            <Card padding={5}>
              <Stack gap={3}>
                <Text type="label" color="secondary">
                  {t("organizationTitle")}
                </Text>
                <Heading level={2}>{actor.organization.name}</Heading>
                <Text color="secondary">{t("organizationBody")}</Text>
              </Stack>
            </Card>
          </Grid>

          <Stack gap={4}>
            <Stack gap={1}>
              <Heading level={2}>{t("accessTitle")}</Heading>
              <Text color="secondary">{t("accessIntro")}</Text>
            </Stack>
            <Grid columns={{minWidth: 260, max: 3}} gap={4}>
              {areas.map((area) => (
                <Card key={area.key} padding={5}>
                  <Stack gap={2}>
                    <Heading level={3}>{t(`areas.${area.key}`)}</Heading>
                    <Text type="supporting" color="secondary">
                      {area.access === "manage" ? t("manage") : t("view")}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Stack>

          {actor.isSupport ? (
            <Section variant="muted" padding={4}>
              <Text type="supporting">{t("supportNote")}</Text>
            </Section>
          ) : null}
        </Stack>
      </Center>
    </Section>
  );
}
