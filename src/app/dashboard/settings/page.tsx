import type {Metadata} from "next";
import {Card} from "@astryxdesign/core/Card";
import {List, ListItem} from "@astryxdesign/core/List";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {PropertyList} from "@/components/layout/property-list";
import {OrganizationSettingsForm} from "@/components/settings/organization-settings-form";
import {SiteManager} from "@/components/settings/site-manager";
import {LabourRateManager} from "@/components/settings/labour-rate-manager";
import {EnergyTariffManager} from "@/components/settings/energy-tariff-manager";
import {EquipmentManager} from "@/components/settings/equipment-manager";
import {EventManager} from "@/components/settings/event-manager";
import {SkillManager} from "@/components/settings/skill-manager";
import {can, type Permission} from "@/lib/permissions";
import {requirePermission} from "@/server/auth/actor";
import {
  equipmentService,
  eventService,
  rateService,
  skillService,
  settingsService,
  siteService,
} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");

  return {title: t("metadataTitle")};
}

type SettingsSection =
  | "organization"
  | "sites"
  | "rates"
  | "equipment"
  | "events"
  | "skills";

const SECTION_PERMISSION: Record<SettingsSection, Permission> = {
  organization: "organization:read",
  sites: "site:read",
  rates: "cost:read",
  equipment: "equipment:read",
  events: "event:read",
  skills: "team:read",
};

const SECTIONS: SettingsSection[] = [
  "organization",
  "sites",
  "rates",
  "equipment",
  "events",
  "skills",
];

function isSection(value: string): value is SettingsSection {
  return (SECTIONS as string[]).includes(value);
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("organization:read");
  const t = await getTranslations("Settings");
  const tOrganization = await getTranslations("Settings.organization");
  const tSites = await getTranslations("Sites");
  const tRates = await getTranslations("Rates");
  const tEquipment = await getTranslations("Equipment");
  const tEvents = await getTranslations("Events");
  const tSkills = await getTranslations("Skills");
  const params = await searchParams;

  const requested = Array.isArray(params.section)
    ? params.section[0]
    : params.section;
  const section =
    requested && isSection(requested) && can(actor.role, SECTION_PERMISSION[requested])
      ? requested
      : "organization";

  const sectionLabel: Record<SettingsSection, string> = {
    organization: t("organization.title"),
    sites: t("cards.sites.title"),
    rates: t("cards.rates.title"),
    equipment: t("cards.equipment.title"),
    events: t("cards.events.title"),
    skills: t("cards.skills.title"),
  };

  const settingsView =
    section === "organization"
      ? await settingsService.getSettings(actor)
      : null;
  const sitesView =
    section === "sites" ? await siteService.getSites(actor) : null;
  const ratesView =
    section === "rates" ? await rateService.getRates(actor) : null;
  const equipmentView =
    section === "equipment"
      ? await equipmentService.getEquipment(actor)
      : null;
  const eventsView =
    section === "events" ? await eventService.getEvents(actor) : null;
  const skillsView =
    section === "skills" ? await skillService.getSkills(actor) : null;
  const sitesForPanel =
    section === "rates" || section === "equipment" || section === "events"
      ? (await siteService.getSites(actor)).sites
      : [];

  const visibleSections = SECTIONS.filter((entry) =>
    can(actor.role, SECTION_PERMISSION[entry]),
  );

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      startLabel={t("railTitle")}
      start={
        <Stack gap={3} padding={4}>
          <Text type="label" color="secondary">
            {t("railTitle")}
          </Text>
          <List density="compact" hasDividers edge="flush">
            {visibleSections.map((entry) => (
              <ListItem
                key={entry}
                label={sectionLabel[entry]}
                href={`/dashboard/settings?section=${entry}`}
                isSelected={entry === section}
              />
            ))}
          </List>
        </Stack>
      }
    >
      {section !== "organization" ? (
        <Stack gap={1}>
          <Heading level={2}>
            {section === "sites"
              ? tSites("title")
              : section === "rates"
                ? tRates("title")
                : section === "equipment"
                  ? tEquipment("title")
                  : section === "events"
                    ? tEvents("title")
                    : tSkills("title")}
          </Heading>
          <Text type="supporting">
            {section === "sites"
              ? tSites("intro", {organization: actor.organization.name})
              : section === "rates"
                ? tRates("intro")
                : section === "equipment"
                  ? tEquipment("intro")
                  : section === "events"
                    ? tEvents("intro")
                    : tSkills("intro")}
          </Text>
        </Stack>
      ) : null}

      {section === "organization" && settingsView ? (
        settingsView.canUpdate ? (
          <OrganizationSettingsForm settings={settingsView.settings} />
        ) : (
          <Card padding={5}>
            <PropertyList
              items={[
                {
                  label: tOrganization("fields.currency"),
                  value: settingsView.settings.currency,
                },
                {
                  label: tOrganization("fields.overheadPct"),
                  value: `${settingsView.settings.overheadPct} %`,
                },
                {
                  label: tOrganization("fields.forecastHistoryDays"),
                  value: String(settingsView.settings.forecastHistoryDays),
                },
                {
                  label: tOrganization("fields.forecastSafetyPct"),
                  value: `${settingsView.settings.forecastSafetyPct} %`,
                },
                {
                  label: tOrganization("fields.defaultShelfLifeDays"),
                  value:
                    settingsView.settings.defaultShelfLifeDays === null
                      ? tOrganization("notSet")
                      : String(settingsView.settings.defaultShelfLifeDays),
                },
                {
                  label: tOrganization("fields.lotNumberPattern"),
                  value: settingsView.settings.lotNumberPattern,
                },
              ]}
            />
          </Card>
        )
      ) : null}

      {section === "sites" && sitesView ? (
        <SiteManager
          sites={sitesView.sites}
          canWrite={sitesView.canWrite}
        />
      ) : null}

      {section === "rates" && ratesView ? (
        <Stack gap={6}>
          <LabourRateManager
            rates={ratesView.labourRates}
            sites={sitesForPanel}
            canWrite={ratesView.canWrite}
          />
          <EnergyTariffManager
            tariffs={ratesView.energyTariffs}
            sites={sitesForPanel}
            canWrite={ratesView.canWrite}
          />
        </Stack>
      ) : null}

      {section === "equipment" && equipmentView ? (
        <EquipmentManager
          equipment={equipmentView.equipment}
          sites={sitesForPanel}
          canWrite={equipmentView.canWrite}
        />
      ) : null}

      {section === "events" && eventsView ? (
        <EventManager
          events={eventsView.events}
          sites={sitesForPanel}
          canWrite={eventsView.canWrite}
        />
      ) : null}

      {section === "skills" && skillsView ? (
        <SkillManager
          skills={skillsView.skills}
          canWrite={skillsView.canWrite}
        />
      ) : null}
    </PageShell>
  );
}
