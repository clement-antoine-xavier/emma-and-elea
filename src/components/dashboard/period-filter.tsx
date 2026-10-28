"use client";

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import {usePathname, useRouter} from "next/navigation";

export function PeriodFilter({
  period,
  label,
  options,
}: {
  period: number;
  label: string;
  options: Array<{value: number; label: string}>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <SegmentedControl
      label={label}
      value={String(period)}
      onChange={(value) =>
        router.replace(`${pathname}?period=${value}`, {scroll: false})
      }
    >
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={String(option.value)}
          label={option.label}
        />
      ))}
    </SegmentedControl>
  );
}
