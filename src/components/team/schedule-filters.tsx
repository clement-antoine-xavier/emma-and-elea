"use client";

import {useState} from "react";
import {Button} from "@astryxdesign/core/Button";
import {DateInput} from "@astryxdesign/core/DateInput";
import {HStack} from "@astryxdesign/core/HStack";
import {Selector} from "@astryxdesign/core/Selector";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";

type IsoDate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

export function ScheduleFilters({
  sites,
  siteId,
  week,
}: {
  sites: {id: string; name: string; code: string}[];
  siteId: string;
  week: string;
}) {
  const t = useTranslations("Team.schedule.filters");
  const router = useRouter();
  const [selectedSite, setSelectedSite] = useState(siteId);
  const [selectedWeek, setSelectedWeek] = useState<IsoDate>(week as IsoDate);

  function apply() {
    const params = new URLSearchParams();
    if (selectedSite) params.set("siteId", selectedSite);
    if (selectedWeek) params.set("week", selectedWeek);
    router.push(
      params.size > 0
        ? `/dashboard/team/schedule?${params.toString()}`
        : "/dashboard/team/schedule",
    );
  }

  return (
    <HStack gap={3} align="end" wrap="wrap">
      <Selector
        label={t("site")}
        value={selectedSite}
        onChange={(value) => setSelectedSite(value)}
        options={[
          {value: "", label: t("allSites")},
          ...sites.map((site) => ({
            value: site.id,
            label: `${site.code} · ${site.name}`,
          })),
        ]}
        width={260}
      />
      <DateInput
        label={t("week")}
        description={t("weekHint")}
        value={selectedWeek}
        onChange={(value) => setSelectedWeek((value ?? "") as IsoDate)}
        width={200}
      />
      <Button label={t("apply")} variant="secondary" onClick={apply} />
    </HStack>
  );
}
