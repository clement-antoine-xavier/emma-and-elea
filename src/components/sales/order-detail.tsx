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
  addOrderLineAction,
  cancelOrderAction,
  confirmOrderAction,
  removeOrderLineAction,
} from "@/app/actions/sales.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatMoney, formatQuantity} from "@/lib/format";
import type {OrderDetailRecord, SalesOptions} from "@/lib/dto";
import {
  orderLineInputSchema,
  type OrderLineInputValues,
} from "@/server/validators/sales.schema";

export function OrderDetail({
  order,
  options,
  canWrite,
}: {
  order: OrderDetailRecord;
  options: Pick<SalesOptions, "items" | "units">;
  canWrite: boolean;
}) {
  const t = useTranslations("Sales.order");
  const tValidation = useTranslations("Sales.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isDraft = order.status === "DRAFT";
  const canCancel = isDraft || order.status === "CONFIRMED";
  const schema = useMemo(
    () => orderLineInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<OrderLineInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemId: "",
      quantity: "",
      unitId: "",
      unitPrice: "",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function addLine(values: OrderLineInputValues) {
    setError(null);
    const result = await addOrderLineAction(order.id, values);
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
      const result = await removeOrderLineAction({
        orderId: order.id,
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

  async function confirm() {
    setIsConfirming(true);
    const result = await confirmOrderAction({id: order.id});
    setIsConfirming(false);
    setConfirmOpen(false);
    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }
    router.refresh();
  }

  async function cancel() {
    setIsCancelling(true);
    const result = await cancelOrderAction({id: order.id});
    setIsCancelling(false);
    setCancelOpen(false);
    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }
    router.refresh();
  }

  const unitLabel = (unit: {code: string; labelEn: string; labelFr: string}) =>
    `${unit.code} · ${locale === "fr" ? unit.labelFr : unit.labelEn}`;

  return (
    <Stack gap={6}>
      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      {canWrite ? (
        <HStack gap={3} wrap="wrap">
          {isDraft ? (
            <Button
              label={t("confirm")}
              variant="primary"
              isDisabled={order.lines.length === 0}
              onClick={() => setConfirmOpen(true)}
            />
          ) : null}
          {canCancel ? (
            <Button
              label={t("cancel")}
              variant="secondary"
              onClick={() => setCancelOpen(true)}
            />
          ) : null}
        </HStack>
      ) : null}

      <Stack gap={3}>
        <Heading level={2}>{t("linesTitle")}</Heading>
        <Text type="supporting">{t("linesIntro")}</Text>

        {order.lines.length === 0 ? (
          <Card padding={4}>
            <EmptyState title={t("emptyTitle")} description={t("emptyBody")} isCompact />
          </Card>
        ) : (
          <Table<OrderDetailRecord["lines"][number]>
            data={order.lines}
            idKey="id"
            density="compact"
            columns={[
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
                key: "fulfilled",
                header: t("columns.fulfilled"),
                width: pixel(120),
                align: "end",
                renderCell: (line) =>
                  `${formatQuantity(line.fulfilledQuantity, {locale})} ${line.unitCode}`,
              },
              {
                key: "unitPrice",
                header: t("columns.unitPrice"),
                width: pixel(120),
                align: "end",
                renderCell: (line) =>
                  formatMoney(line.unitPrice, {
                    locale,
                    currency: order.currency,
                  }),
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
                  name="itemId"
                  label={t("fields.item")}
                  options={[
                    {value: "", label: t("chooseItem")},
                    ...options.items.map((item) => ({
                      value: item.id,
                      label: `${item.code} · ${item.name}`,
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
                <FormSelector
                  control={control}
                  name="unitId"
                  label={t("fields.unit")}
                  options={[
                    {value: "", label: t("chooseUnit")},
                    ...options.units.map((unit) => ({
                      value: unit.id,
                      label: unitLabel(unit),
                    })),
                  ]}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="unitPrice"
                  label={t("fields.unitPrice")}
                  isRequired
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
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirmTitle")}
        description={t("confirmBody")}
        actionLabel={t("confirm")}
        cancelLabel={t("back")}
        isActionLoading={isConfirming}
        onAction={confirm}
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
