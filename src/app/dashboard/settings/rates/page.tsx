import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {Center} from "@astryxdesign/core/Center";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {getTranslations} from "next-intl/server";
import {PageHeader} from "@/components/page-header";
import {EnergyTariffManager} from "@/components/settings/energy-tariff-manager";
import {LabourRateManager} from "@/components/settings/labour-rate-manager";
import {requirePermission} from "@/server/auth/actor";
import {rateService, siteService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Rates");

  return {title: t("metadataTitle")};
}

export default async function RatesPage() {
  const actor = await requirePermission("cost:read");
  const t = await getTranslations("Rates");
  const tSettings = await getTranslations("Settings");
  const [{labourRates, energyTariffs, canWrite}, {sites}] = await Promise.all([
    rateService.getRates(actor),
    siteService.getSites(actor),
  ]);

  return (
    <Section padding={6} minHeight="100%">
      <Center axis="horizontal">
        <Stack gap={8} maxWidth={1120} width="100%">
          <PageHeader
            title={t("title")}
            intro={t("intro")}
            actions={
              <Button
                label={tSettings("backToSettings")}
                variant="secondary"
                href="/dashboard/settings"
              />
            }
          />

          <LabourRateManager
            rates={labourRates}
            sites={sites}
            canWrite={canWrite}
          />
          <EnergyTariffManager
            tariffs={energyTariffs}
            sites={sites}
            canWrite={canWrite}
          />
        </Stack>
      </Center>
    </Section>
  );
}
