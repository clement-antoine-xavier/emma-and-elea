"use client";

import {useState} from "react";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Switch} from "@astryxdesign/core/Switch";
import {TextInput} from "@astryxdesign/core/TextInput";
import {useTranslations} from "next-intl";
import {usePathname, useRouter} from "next/navigation";

export function LotFilters({
  initialSearch,
  initialIncludeEmpty,
}: {
  initialSearch: string;
  initialIncludeEmpty: boolean;
}) {
  const t = useTranslations("Stock.lots.filters");
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(initialSearch);
  const [includeEmpty, setIncludeEmpty] = useState(initialIncludeEmpty);

  function submit() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (includeEmpty) params.set("includeEmpty", "true");
    router.push(params.size > 0 ? `${pathname}?${params}` : pathname);
  }

  return (
    <Card padding={4}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Stack gap={4}>
          <TextInput
            label={t("search")}
            value={search}
            onChange={setSearch}
            placeholder={t("searchPlaceholder")}
          />
          <HStack gap={4} wrap="wrap" align="end">
            <Switch
              label={t("includeEmpty")}
              value={includeEmpty}
              onChange={setIncludeEmpty}
            />
            <Button
              type="submit"
              variant="secondary"
              label={t("apply")}
            />
          </HStack>
        </Stack>
      </form>
    </Card>
  );
}
