"use client";

import {DateInput} from "@astryxdesign/core/DateInput";
import {usePathname, useRouter} from "next/navigation";
import {useTranslations} from "next-intl";

export function TaskDateFilter({date}: {date: string}) {
  const t = useTranslations("Tasks");
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DateInput
      label={t("dateLabel")}
      value={date as `${number}${number}${number}${number}-${number}${number}-${number}${number}`}
      onChange={(value) =>
        router.replace(`${pathname}?date=${value ?? ""}`, {scroll: false})
      }
    />
  );
}
