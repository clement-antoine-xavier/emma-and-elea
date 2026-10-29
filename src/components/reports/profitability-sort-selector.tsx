"use client";

import {Selector} from "@astryxdesign/core/Selector";
import {usePathname, useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {
  PROFITABILITY_SORTS,
  type ProfitabilitySort,
} from "@/lib/profitability";

export function ProfitabilitySortSelector({
  sort,
}: {
  sort: ProfitabilitySort;
}) {
  const t = useTranslations("Reports.profitability.sort");
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Selector
      label={t("label")}
      value={sort}
      options={PROFITABILITY_SORTS.map((value) => ({
        value,
        label: t(value),
      }))}
      onChange={(value) =>
        router.replace(`${pathname}?sort=${value}`, {scroll: false})
      }
    />
  );
}
