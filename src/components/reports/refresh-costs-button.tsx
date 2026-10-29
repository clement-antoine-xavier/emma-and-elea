"use client";

import {useState} from "react";
import {Button} from "@astryxdesign/core/Button";
import {HStack} from "@astryxdesign/core/HStack";
import {Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {refreshAllRecipeCostsAction} from "@/app/actions/recipe.actions";

export function RefreshCostsButton() {
  const t = useTranslations("Reports.costs");
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setIsRefreshing(true);
    setSummary(null);
    setError(null);

    try {
      const result = await refreshAllRecipeCostsAction();
      if (!result.ok) {
        setError(t("error"));
        return;
      }

      setSummary(
        t("refreshed", {
          refreshed: result.refreshed ?? 0,
          skipped: result.skipped ?? 0,
        }),
      );
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <HStack gap={3} align="center" wrap="wrap">
      <Button
        label={t("refresh")}
        variant="secondary"
        isLoading={isRefreshing}
        onClick={refresh}
      />
      {summary ? (
        <Text type="supporting" color="secondary">
          {summary}
        </Text>
      ) : null}
      {error ? (
        <Text type="supporting" color="secondary">
          {error}
        </Text>
      ) : null}
    </HStack>
  );
}
