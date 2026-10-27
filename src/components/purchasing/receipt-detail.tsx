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
import {Grid} from "@astryxdesign/core/Grid";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  addReceiptLineAction,
  cancelReceiptAction,
  postReceiptAction,
  removeReceiptLineAction,
} from "@/app/actions/purchasing.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatBusinessDate, formatMoney} from "@/lib/format";
import type {
  ReceiptDetailRecord,
  ReceiptLineRecord,
} from "@/lib/dto";
import {
  receiptLineSchema,
  type ReceiptLineValues,
} from "@/server/validators/purchasing.schema";

function Definition({label, value}: {label: string; value: string}) {
  return (
    <Stack gap={1}>
      <Text type="label" color="secondary">
        {label}
      </Text>
      <Text>{value}</Text>
    </Stack>
  );
}

export function ReceiptDetail({
  receipt,
  items,
  units,
  canWrite,
}: {
  receipt: ReceiptDetailRecord;
  items: {id: string; code: string; name: string}[];
  units: {id: string; code: string; labelEn: string; labelFr: string}[];
  canWrite: boolean;
}) {
  const t = useTranslations("Purchasing.detail");
  const tStatuses = useTranslations("Purchasing.statuses");
  const tLine = useTranslations("Purchasing.lineForm");
  const tValidation = useTranslations("Purchasing.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingLine, setPendingLine] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const isDraft = receipt.status === "DRAFT";
  const schema = useMemo(
    () => receiptLineSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<ReceiptLineValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemId: "",
      quantity: "",
      unitId: "",
      unitPrice: "",
      lotNumber: "",
      supplierLotNumber: "",
      expiresOn: "",
      bestBeforeOn: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function addLine(values: ReceiptLineValues) {
    setError(null);
    const result = await addReceiptLineAction(receipt.id, values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset();
    router.refresh();
  }

  async function removeLine(line: ReceiptLineRecord) {
    setError(null);
    setPendingLine(line.id);

    try {
      const result = await removeReceiptLineAction({
        receiptId: receipt.id,
        lineId: line.id,
      });
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingLine(null);
    }
  }

  async function post() {
    setIsPosting(true);
    const result = await postReceiptAction({id: receipt.id});
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
    const result = await cancelReceiptAction({id: receipt.id});
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
      <Card padding={5}>
        <Grid columns={{minWidth: 180, max: 3}} gap={4}>
          <Definition label={t("supplier")} value={receipt.supplierName} />
          <Definition label={t("site")} value={receipt.siteName} />
          <Definition
            label={t("reference")}
            value={receipt.supplierReference ?? "—"}
          />
          <Definition
            label={t("createdAt")}
            value={formatBusinessDate(receipt.createdAt, {locale})}
          />
          <Definition
            label={t("receivedAt")}
            value={
              receipt.receivedAt
                ? formatBusinessDate(receipt.receivedAt, {locale})
                : "—"
            }
          />
          <Definition
            label={t("total")}
            value={formatMoney(receipt.totalAmount, {
              locale,
              currency: receipt.currency,
            })}
          />
        </Grid>
      </Card>

      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      {isDraft && canWrite ? (
        <HStack gap={3} wrap="wrap">
          <Button
            label={t("post")}
            variant="primary"
            isDisabled={receipt.lines.length === 0}
            onClick={() => setPostOpen(true)}
          />
          <Button
            label={t("cancelReceipt")}
            variant="secondary"
            onClick={() => setCancelOpen(true)}
          />
        </HStack>
      ) : null}

      <Stack gap={3}>
        <Stack gap={1}>
          <Heading level={2}>{t("linesTitle")}</Heading>
          <Text type="supporting">
            {t("linesIntro", {status: tStatuses(receipt.status)})}
          </Text>
        </Stack>

        {receipt.lines.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<ReceiptLineRecord>
            data={receipt.lines}
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
                renderCell: (line) => `${line.quantity} ${line.unitCode}`,
              },
              {
                key: "unitPrice",
                header: t("columns.unitPrice"),
                width: pixel(120),
                align: "end",
                renderCell: (line) =>
                  formatMoney(line.unitPrice, {
                    locale,
                    currency: receipt.currency,
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 4,
                  }),
              },
              {
                key: "lineTotal",
                header: t("columns.lineTotal"),
                width: pixel(120),
                align: "end",
                renderCell: (line) =>
                  formatMoney(line.lineTotal, {
                    locale,
                    currency: receipt.currency,
                  }),
              },
              {
                key: "lot",
                header: t("columns.lot"),
                width: proportional(2),
                renderCell: (line) =>
                  line.lotNumber ?? "—",
              },
              {
                key: "expiresOn",
                header: t("columns.expiresOn"),
                width: pixel(140),
                renderCell: (line) =>
                  line.expiresOn
                    ? formatBusinessDate(line.expiresOn, {locale})
                    : "—",
              },
              {
                key: "actions",
                header: "",
                width: pixel(110),
                renderCell: (line) =>
                  isDraft && canWrite ? (
                    <Button
                      label={t("remove")}
                      variant="ghost"
                      size="sm"
                      isLoading={pendingLine === line.id}
                      onClick={() => removeLine(line)}
                    />
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
                <Heading level={2}>{tLine("title")}</Heading>
                <Text type="supporting">{tLine("intro")}</Text>
              </Stack>

              {errors.root?.message ? (
                <Banner
                  status="error"
                  title={tLine("errorTitle")}
                  description={errors.root.message}
                />
              ) : null}

              <FormLayout>
                <FormSelector
                  control={control}
                  name="itemId"
                  label={tLine("fields.item")}
                  options={[
                    {value: "", label: tLine("chooseItem")},
                    ...items.map((item) => ({
                      value: item.id,
                      label: `${item.code} · ${item.name}`,
                    })),
                  ]}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="quantity"
                  label={tLine("fields.quantity")}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="unitId"
                  label={tLine("fields.unit")}
                  options={[
                    {value: "", label: tLine("chooseUnit")},
                    ...units.map((unit) => ({
                      value: unit.id,
                      label: unitLabel(unit),
                    })),
                  ]}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="unitPrice"
                  label={tLine("fields.unitPrice")}
                  description={tLine("fields.unitPriceHint")}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="lotNumber"
                  label={tLine("fields.lotNumber")}
                  description={tLine("fields.lotNumberHint")}
                />
                <FormTextInput
                  control={control}
                  name="supplierLotNumber"
                  label={tLine("fields.supplierLotNumber")}
                />
                <FormDateInput
                  control={control}
                  name="expiresOn"
                  label={tLine("fields.expiresOn")}
                />
                <FormDateInput
                  control={control}
                  name="bestBeforeOn"
                  label={tLine("fields.bestBeforeOn")}
                />
              </FormLayout>

              <Button
                type="submit"
                variant="primary"
                label={tLine("submit")}
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
        cancelLabel={t("cancel")}
        isActionLoading={isPosting}
        onAction={post}
      />
      <AlertDialog
        isOpen={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("cancelTitle")}
        description={t("cancelBody")}
        actionLabel={t("cancelConfirm")}
        cancelLabel={t("cancel")}
        isActionLoading={isCancelling}
        onAction={cancel}
      />
    </Stack>
  );
}
