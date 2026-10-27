"use client";

import {useState} from "react";
import {AlertDialog} from "@astryxdesign/core/AlertDialog";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  cancelPlanAction,
  closePlanAction,
  confirmPlanAction,
} from "@/app/actions/planning.actions";
import type {ProductionPlanDetailRecord} from "@/lib/dto";

export function PlanActions({plan}: {plan: ProductionPlanDetailRecord}) {
  const t = useTranslations("Production.planning.actions");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"confirm" | "close" | "cancel" | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  async function run() {
    setIsLoading(true);
    const result =
      dialog === "confirm"
        ? await confirmPlanAction({id: plan.id})
        : dialog === "close"
          ? await closePlanAction({id: plan.id})
          : await cancelPlanAction({id: plan.id});
    setIsLoading(false);
    setDialog(null);
    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }
    router.refresh();
  }

  const canConfirm = plan.status === "DRAFT";
  const canClose = plan.status === "CONFIRMED";
  const canCancel =
    plan.status === "DRAFT" || plan.status === "CONFIRMED";

  return (
    <Stack gap={3}>
      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}
      <HStack gap={3} wrap="wrap">
        {canConfirm ? (
          <Button
            label={t("confirm")}
            variant="primary"
            isDisabled={plan.lines.length === 0}
            onClick={() => setDialog("confirm")}
          />
        ) : null}
        {canClose ? (
          <Button
            label={t("close")}
            variant="secondary"
            onClick={() => setDialog("close")}
          />
        ) : null}
        {canCancel ? (
          <Button
            label={t("cancel")}
            variant="secondary"
            onClick={() => setDialog("cancel")}
          />
        ) : null}
      </HStack>

      <AlertDialog
        isOpen={dialog === "confirm"}
        onOpenChange={(open) => setDialog(open ? "confirm" : null)}
        title={t("confirmTitle")}
        description={t("confirmBody")}
        actionLabel={t("confirm")}
        cancelLabel={t("back")}
        isActionLoading={isLoading}
        onAction={run}
      />
      <AlertDialog
        isOpen={dialog === "close"}
        onOpenChange={(open) => setDialog(open ? "close" : null)}
        title={t("closeTitle")}
        description={t("closeBody")}
        actionLabel={t("close")}
        cancelLabel={t("back")}
        isActionLoading={isLoading}
        onAction={run}
      />
      <AlertDialog
        isOpen={dialog === "cancel"}
        onOpenChange={(open) => setDialog(open ? "cancel" : null)}
        title={t("cancelTitle")}
        description={t("cancelBody")}
        actionLabel={t("cancelConfirm")}
        cancelLabel={t("back")}
        isActionLoading={isLoading}
        onAction={run}
      />
    </Stack>
  );
}
