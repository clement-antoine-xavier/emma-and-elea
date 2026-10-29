"use client";

import {Button} from "@astryxdesign/core/Button";
import {useTranslations} from "next-intl";

export function PrintButton() {
  const t = useTranslations("Print");

  return (
    <Button
      label={t("action")}
      variant="secondary"
      onClick={() => window.print()}
    />
  );
}
