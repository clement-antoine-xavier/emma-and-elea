"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {AlertDialog} from "@astryxdesign/core/AlertDialog";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  cancelProductionBatchAction,
  completeProductionBatchAction,
  startProductionBatchAction,
} from "@/app/actions/production.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormTextInput} from "@/components/form-text-input";
import {
  completeBatchSchema,
  type CompleteBatchValues,
} from "@/server/validators/production.schema";

export function BatchActions({
  batchId,
  status,
  canExecute,
  canWrite,
}: {
  batchId: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  canExecute: boolean;
  canWrite: boolean;
}) {
  const t = useTranslations("Production.actions");
  const tValidation = useTranslations("Production.validation");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const canComplete = status === "PLANNED" || status === "IN_PROGRESS";
  const schema = useMemo(
    () => completeBatchSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<CompleteBatchValues>({
    resolver: zodResolver(schema),
    defaultValues: {actualQuantity: "", producedOn: ""},
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function start() {
    setIsStarting(true);
    setError(null);
    const result = await startProductionBatchAction({id: batchId});
    setIsStarting(false);

    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }

    router.refresh();
  }

  async function cancel() {
    setIsCancelling(true);
    setError(null);
    const result = await cancelProductionBatchAction({id: batchId});
    setIsCancelling(false);
    setCancelOpen(false);

    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }

    router.refresh();
  }

  async function complete(values: CompleteBatchValues) {
    setError(null);
    const result = await completeProductionBatchAction(batchId, values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    router.refresh();
  }

  if (status === "COMPLETED" || status === "CANCELLED") {
    return null;
  }

  return (
    <Stack gap={4}>
      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      <HStack gap={3} wrap="wrap">
        {status === "PLANNED" && canExecute ? (
          <Button
            label={t("start")}
            variant="secondary"
            isLoading={isStarting}
            onClick={start}
          />
        ) : null}
        {canWrite ? (
          <Button
            label={t("cancel")}
            variant="secondary"
            onClick={() => setCancelOpen(true)}
          />
        ) : null}
      </HStack>

      {canComplete && canExecute ? (
        <Card padding={5}>
          <form onSubmit={handleSubmit(complete)} noValidate>
            <Stack gap={4}>
              <Stack gap={1}>
                <Heading level={2}>{t("completeTitle")}</Heading>
                <Text type="supporting">{t("completeIntro")}</Text>
              </Stack>

              {errors.root?.message ? (
                <Banner
                  status="error"
                  title={t("completeErrorTitle")}
                  description={errors.root.message}
                />
              ) : null}

              <FormLayout>
                <FormTextInput
                  control={control}
                  name="actualQuantity"
                  label={t("fields.actualQuantity")}
                  isRequired
                />
                <FormDateInput
                  control={control}
                  name="producedOn"
                  label={t("fields.producedOn")}
                />
              </FormLayout>

              <Button
                type="submit"
                variant="primary"
                label={t("complete")}
                isLoading={isSubmitting}
              />
            </Stack>
          </form>
        </Card>
      ) : null}

      <AlertDialog
        isOpen={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("cancelTitle")}
        description={t("cancelBody")}
        actionLabel={t("cancelConfirm")}
        cancelLabel={t("back")}
        isActionLoading={isCancelling}
        onAction={cancel}
      />
    </Stack>
  );
}
