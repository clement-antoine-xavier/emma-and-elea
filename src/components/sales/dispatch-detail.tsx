"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {AlertDialog} from "@astryxdesign/core/AlertDialog";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  addDispatchLineAction,
  cancelDispatchAction,
  postDispatchAction,
  removeDispatchLineAction,
} from "@/app/actions/sales.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatMoney, formatQuantity} from "@/lib/format";
import type {DispatchDetailRecord, SalesOptions} from "@/lib/dto";
import {
  dispatchLineInputSchema,
  type DispatchLineInputValues,
} from "@/server/validators/sales.schema";

export function DispatchDetail({
  dispatch,
  lots,
  currency,
  canWrite,
}: {
  dispatch: DispatchDetailRecord;
  lots: SalesOptions["lots"];
  currency: string;
  canWrite: boolean;
}) {
  const t = useTranslations("Sales.dispatch");
  const tValidation = useTranslations("Sales.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isDraft = dispatch.status === "DRAFT";
  const schema = useMemo(
    () => dispatchLineInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<DispatchLineInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {lotId: "", quantity: "", unitPrice: "", note: ""},
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function addLine(values: DispatchLineInputValues) {
    setError(null);
    const result = await addDispatchLineAction(dispatch.id, values);
    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }
    reset();
    router.refresh();
  }

  async function removeLine(lineId: string) {
    setError(null);
    setPendingId(lineId);
    try {
      const result = await removeDispatchLineAction({
        dispatchId: dispatch.id,
        lineId,
      });
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function post() {
    setIsPosting(true);
    const result = await postDispatchAction({id: dispatch.id});
    setIsPosting(false);
    setPostOpen(false);
    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }
    router.refresh();
  }

  async function cancel() {
    setIsCancelling(true);
    const result = await cancelDispatchAction({id: dispatch.id});
    setIsCancelling(false);
    setCancelOpen(false);
    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }
    router.refresh();
  }

  const siteLots = lots.filter((lot) => lot.siteId === dispatch.siteId);

  return (
    <Stack gap={6}>
      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      {isDraft && canWrite ? (
        <HStack gap={3} wrap="wrap">
          <Button
            label={t("post")}
            variant="primary"
            isDisabled={dispatch.lines.length === 0}
            onClick={() => setPostOpen(true)}
          />
          <Button
            label={t("cancel")}
            variant="secondary"
            onClick={() => setCancelOpen(true)}
          />
        </HStack>
      ) : null}

      <Stack gap={3}>
        <Heading level={2}>{t("linesTitle")}</Heading>
        <Text type="supporting">{t("linesIntro")}</Text>

        {dispatch.lines.length === 0 ? (
          <Card padding={4}>
            <EmptyState title={t("emptyTitle")} description={t("emptyBody")} isCompact />
          </Card>
        ) : (
          <Table<DispatchDetailRecord["lines"][number]>
            data={dispatch.lines}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "lot",
                header: t("columns.lot"),
                width: pixel(160),
                renderCell: (line) => line.lotNumber,
              },
              {
                key: "item",
                header: t("columns.item"),
                width: proportional(3),
                renderCell: (line) => (
                  <Stack gap={0}>
                    <Text weight="semibold">{line.itemName}</Text>
                    <Text type="supporting" color="secondary">
                      {line.itemCode}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: "quantity",
                header: t("columns.quantity"),
                width: pixel(120),
                align: "end",
                renderCell: (line) =>
                  `${formatQuantity(line.quantity, {locale})} ${line.unitCode}`,
              },
              {
                key: "unitPrice",
                header: t("columns.unitPrice"),
                width: pixel(120),
                align: "end",
                renderCell: (line) =>
                  line.unitPrice
                    ? formatMoney(line.unitPrice, {locale, currency})
                    : "—",
              },
              {
                key: "actions",
                header: "",
                width: pixel(110),
                renderCell: (line) =>
                  isDraft && canWrite ? (
                    <HStack gap={2}>
                      <Button
                        label={t("remove")}
                        variant="ghost"
                        size="sm"
                        isLoading={pendingId === line.id}
                        onClick={() => removeLine(line.id)}
                      />
                    </HStack>
                  ) : null,
              },
            ]}
          />
        )}
      </Stack>

      {isDraft && canWrite ? (
        <Card padding={5}>
          <form onSubmit={handleSubmit(addLine)} noValidate>
            <Stack gap={4}>
              <Stack gap={1}>
                <Heading level={2}>{t("addTitle")}</Heading>
                <Text type="supporting">{t("addIntro")}</Text>
              </Stack>

              {errors.root?.message ? (
                <Banner
                  status="error"
                  title={t("addErrorTitle")}
                  description={errors.root.message}
                />
              ) : null}

              <FormLayout>
                <FormSelector
                  control={control}
                  name="lotId"
                  label={t("fields.lot")}
                  options={[
                    {value: "", label: t("chooseLot")},
                    ...siteLots.map((lot) => ({
                      value: lot.id,
                      label: `${lot.lotNumber} · ${lot.itemName} (${lot.quantityRemaining} ${lot.unitCode})`,
                    })),
                  ]}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="quantity"
                  label={t("fields.quantity")}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="unitPrice"
                  label={t("fields.unitPrice")}
                />
                <FormTextInput
                  control={control}
                  name="note"
                  label={t("fields.note")}
                />
              </FormLayout>

              <Button
                type="submit"
                variant="primary"
                label={t("submit")}
                isLoading={isSubmitting}
              />
            </Stack>
          </form>
        </Card>
      ) : null}

      <AlertDialog
        isOpen={postOpen}
        onOpenChange={setPostOpen}
        title={t("postTitle")}
        description={t("postBody")}
        actionLabel={t("postConfirm")}
        cancelLabel={t("back")}
        isActionLoading={isPosting}
        onAction={post}
      />
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
