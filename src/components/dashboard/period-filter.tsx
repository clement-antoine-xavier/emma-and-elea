"use client";

import {Button} from "@astryxdesign/core/Button";
import {HStack} from "@astryxdesign/core/HStack";
import {Text} from "@astryxdesign/core/Text";
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
    <HStack gap={2} align="center" wrap="wrap">
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      {options.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={option.value === period ? "primary" : "secondary"}
          label={option.label}
          onClick={() =>
            router.replace(`${pathname}?period=${option.value}`, {
              scroll: false,
            })
          }
        />
      ))}
    </HStack>
  );
}
