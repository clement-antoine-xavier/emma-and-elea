"use client";

import {useState} from "react";
import {AlertDialog} from "@astryxdesign/core/AlertDialog";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {TextInput} from "@astryxdesign/core/TextInput";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  cancelStockCountAction,
  postStockCountAction,
  updateStockCountLinesAction,
} from "@/app/actions/stock-count.actions";
import {formatQuantity} from "@/lib/format";
import type {
  StockCountDetailRecord,
  StockCountLineRecord,
} from "@/lib/dto";

function varianceFor(line: StockCountLineRecord, counted: string): string {
  const value = Number(counted);
  if (!Number.isFinite(value)) return line.variance;
  return String(value - Number(line.expectedQuantity));
}

export function StockCountDetail({
  count,
  canCount,
  canPost,
}: {
  count: StockCountDetailRecord;
  canCount: boolean;
  canPost: boolean;
}) {
  const t = useTranslations("Stock.counts.detail");
  const tStatuses = useTranslations("Stock.counts.statuses");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      count.lines.map((line) => [line.id, line.countedQuantity]),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [dialog, setDialog] = useState<"post" | "cancel" | null>(null);
  const [isActing, setIsActing] = useState(false);

  const isDraft = count.status === "DRAFT";
  const canEdit = isDraft && canCount;

  async function save() {
    setError(null);
    setSaved(false);
    setIsSaving(true);
    const result = await updateStockCountLinesAction(count.id, {
      lines: count.lines.map((line) => ({
        id: line.id,
        countedQuantity: values[line.id] ?? line.countedQuantity,
      })),
    });
    setIsSaving(false);
    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function run() {
    setIsActing(true);
    const result =
      dialog === "post"
        ? await postStockCountAction({id: count.id})
        : await cancelStockCountAction({id: count.id});
    setIsActing(false);
    setDialog(null);
    if (!result.ok) {
      setError(tErrors(result.error));
      return;
    }
    router.refresh();
  }

  return (
    <Stack gap={6}>
      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}
      {saved ? (
        <Banner
          status="success"
          title={t("savedTitle")}
          description={t("savedBody")}
        />
      ) : null}
      {isDraft && !canPost ? (
        <Banner
          status="info"
          title={t("awaitingPostTitle")}
          description={t("awaitingPostBody")}
        />
      ) : null}

      {isDraft && canPost ? (
        <HStack gap={3} wrap="wrap">
          <Button
            label={t("post")}
            variant="primary"
            isDisabled={count.lines.length === 0}
            onClick={() => setDialog("post")}
          />
          <Button
            label={t("cancel")}
            variant="secondary"
            onClick={() => setDialog("cancel")}
          />
        </HStack>
      ) : null}

      <Stack gap={3}>
        <Stack gap={1}>
          <Heading level={2}>{t("linesTitle")}</Heading>
          <Text type="supporting">
            {t("linesIntro", {status: tStatuses(count.status)})}
          </Text>
        </Stack>

        {count.lines.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<StockCountLineRecord>
            data={count.lines}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "lot",
                header: t("columns.lot"),
                width: pixel(160),
                renderCell: (line) => line.lotNumber ?? "—",
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
                key: "expected",
                header: t("columns.expected"),
                width: pixel(120),
                align: "end",
                renderCell: (line) =>
                  `${formatQuantity(line.expectedQuantity, {locale})} ${line.unitCode}`,
              },
              {
                key: "counted",
                header: t("columns.counted"),
                width: pixel(170),
                align: "end",
                renderCell: (line) =>
                  canEdit ? (
                    <TextInput
                      label={t("countedFor", {
                        lot: line.lotNumber ?? line.itemName,
                      })}
                      isLabelHidden
                      value={values[line.id] ?? line.countedQuantity}
                      onChange={(value: string) =>
                        setValues((current) => ({
                          ...current,
                          [line.id]: value,
                        }))
                      }
                      width={120}
                    />
                  ) : (
                    `${formatQuantity(line.countedQuantity, {locale})} ${line.unitCode}`
                  ),
              },
              {
                key: "variance",
                header: t("columns.variance"),
                width: pixel(120),
                align: "end",
                renderCell: (line) =>
                  `${formatQuantity(
                    varianceFor(
                      line,
                      values[line.id] ?? line.countedQuantity,
                    ),
                    {locale},
                  )} ${line.unitCode}`,
              },
            ]}
          />
        )}

        {canEdit && count.lines.length > 0 ? (
          <Button
            label={t("save")}
            variant="primary"
            isLoading={isSaving}
            onClick={save}
          />
        ) : null}
      </Stack>

      <AlertDialog
        isOpen={dialog === "post"}
        onOpenChange={(open) => setDialog(open ? "post" : null)}
        title={t("postTitle")}
        description={t("postBody")}
        actionLabel={t("postConfirm")}
        cancelLabel={t("back")}
        isActionLoading={isActing}
        onAction={run}
      />
      <AlertDialog
        isOpen={dialog === "cancel"}
        onOpenChange={(open) => setDialog(open ? "cancel" : null)}
        title={t("cancelTitle")}
        description={t("cancelBody")}
        actionLabel={t("cancelConfirm")}
        cancelLabel={t("back")}
        isActionLoading={isActing}
        onAction={run}
      />
    </Stack>
  );
}
