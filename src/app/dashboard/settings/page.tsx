import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {OrganizationSettingsForm} from "@/components/settings/organization-settings-form";
import {can} from "@/lib/permissions";
import {requirePermission} from "@/server/auth/actor";
import {settingsService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");

  return {title: t("metadataTitle")};
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

export default async function SettingsPage() {
  const actor = await requirePermission("organization:read");
  const t = await getTranslations("Settings");
  const tOrganization = await getTranslations("Settings.organization");
  const {settings, canUpdate} = await settingsService.getSettings(actor);

  const cards = [
    {
      key: "sites",
      href: "/dashboard/settings/sites",
      visible: can(actor.role, "site:read"),
    },
    {
      key: "rates",
      href: "/dashboard/settings/rates",
      visible: can(actor.role, "cost:read"),
    },
    {
      key: "equipment",
      href: "/dashboard/settings/equipment",
      visible: can(actor.role, "equipment:read"),
    },
  ] as const;

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={6} maxWidth={1120} width="100%">
          <PageHeader title={t("title")} intro={t("intro")} />

          {canUpdate ? (
            <OrganizationSettingsForm settings={settings} />
          ) : (
            <Card padding={5}>
              <Stack gap={4}>
                <Stack gap={1}>
                  <Heading level={2}>{tOrganization("title")}</Heading>
                  <Text type="supporting">{tOrganization("intro")}</Text>
                </Stack>
                <Grid columns={{minWidth: 200, max: 3}} gap={4}>
                  <Definition
                    label={tOrganization("fields.currency")}
                    value={settings.currency}
                  />
                  <Definition
                    label={tOrganization("fields.overheadPct")}
                    value={`${settings.overheadPct} %`}
                  />
                  <Definition
                    label={tOrganization("fields.forecastHistoryDays")}
                    value={String(settings.forecastHistoryDays)}
                  />
                  <Definition
                    label={tOrganization("fields.forecastSafetyPct")}
                    value={`${settings.forecastSafetyPct} %`}
                  />
                  <Definition
                    label={tOrganization("fields.defaultShelfLifeDays")}
                    value={
                      settings.defaultShelfLifeDays === null
                        ? tOrganization("notSet")
                        : String(settings.defaultShelfLifeDays)
                    }
                  />
                  <Definition
                    label={tOrganization("fields.lotNumberPattern")}
                    value={settings.lotNumberPattern}
                  />
                </Grid>
              </Stack>
            </Card>
          )}

          <Stack gap={3}>
            <Heading level={2}>{t("manageTitle")}</Heading>
            <Grid columns={{minWidth: 260, max: 3}} gap={4}>
              {cards
                .filter((card) => card.visible)
                .map((card) => (
                  <Card key={card.key} padding={5}>
                    <Stack gap={3}>
                      <Stack gap={1}>
                        <Heading level={3}>
                          {t(`cards.${card.key}.title`)}
                        </Heading>
                        <Text color="secondary">
                          {t(`cards.${card.key}.body`)}
                        </Text>
                      </Stack>
                      <Button
                        label={t(`cards.${card.key}.action`)}
                        variant="secondary"
                        href={card.href}
                      />
                    </Stack>
                  </Card>
                ))}
            </Grid>
          </Stack>
        </Stack>
      </Center>
    </Section>
  );
}
