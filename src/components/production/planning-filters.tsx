"use client";

import {useState} from "react";
import {Button} from "@astryxdesign/core/Button";
import {DateInput} from "@astryxdesign/core/DateInput";
import {HStack} from "@astryxdesign/core/HStack";
import {Selector} from "@astryxdesign/core/Selector";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";

type IsoDate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

export function PlanningFilters({
  sites,
  siteId,
  date,
}: {
  sites: {id: string; name: string; code: string}[];
  siteId: string;
  date: string;
}) {
  const t = useTranslations("Production.planning.filters");
  const router = useRouter();
  const [selectedSite, setSelectedSite] = useState(siteId);
  const [selectedDate, setSelectedDate] = useState<IsoDate>(date as IsoDate);

  function apply() {
    const params = new URLSearchParams();
    if (selectedSite) params.set("siteId", selectedSite);
    if (selectedDate) params.set("date", selectedDate);
    router.push(
      params.size > 0
        ? `/dashboard/production/planning?${params.toString()}`
        : "/dashboard/production/planning",
    );
  }

  return (
    <HStack gap={3} align="end" wrap="wrap">
      <Selector
        label={t("site")}
        value={selectedSite}
        onChange={(value) => setSelectedSite(value)}
        options={sites.map((site) => ({
          value: site.id,
          label: `${site.code} · ${site.name}`,
        }))}
        width={260}
      />
      <DateInput
        label={t("date")}
        value={selectedDate}
        onChange={(value) => setSelectedDate((value ?? "") as IsoDate)}
        width={200}
      />
      <Button
        label={t("apply")}
        variant="secondary"
        onClick={apply}
        isDisabled={!selectedSite || !selectedDate}
      />
    </HStack>
  );
}
