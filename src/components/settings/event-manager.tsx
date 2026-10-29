"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Badge} from "@astryxdesign/core/Badge";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Dialog, DialogHeader} from "@astryxdesign/core/Dialog";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  archiveEventAction,
  createEventAction,
} from "@/app/actions/event.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormTextArea} from "@/components/form-text-area";
import {FormTextInput} from "@/components/form-text-input";
import {formatBusinessDate, formatPercent} from "@/lib/format";
import type {EventRecord, SiteRecord} from "@/lib/dto";
import {
  createEventSchema,
  EVENT_KINDS,
  type CreateEventValues,
} from "@/server/validators/event.schema";

export function EventManager({
  events,
  sites,
  canWrite,
}: {
  events: EventRecord[];
  sites: SiteRecord[];
  canWrite: boolean;
}) {
  const t = useTranslations("Events");
  const tValidation = useTranslations("Events.validation");
  const tErrors = useTranslations("Settings.errors");
  const locale = useLocale();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const schema = useMemo(
    () => createEventSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<CreateEventValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      kind: "LOCAL_EVENT",
      siteId: "",
      startsOn: "",
      endsOn: "",
      expectedUpliftPct: "",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  const activeSites = sites.filter((site) => !site.archivedAt);

  async function onSubmit(values: CreateEventValues) {
    setError(null);
    const result = await createEventAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset();
    setCreateOpen(false);
    router.refresh();
  }

  async function archive(item: EventRecord) {
    setError(null);
    setPendingId(item.id);

    try {
      const result = await archiveEventAction({id: item.id});
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Stack gap={6}>
      {canWrite ? (
        <Dialog
          isOpen={createOpen}
          onOpenChange={setCreateOpen}
          width={520}
          purpose="form"
        >
          <DialogHeader
            title={t("createTitle")}
            subtitle={t("createIntro")}
            onOpenChange={setCreateOpen}
          />
          <Card padding={0}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack gap={4}>
                {errors.root?.message ? (
                  <Banner
                    status="error"
                    title={t("errorTitle")}
                    description={errors.root.message}
                  />
                ) : null}

                <FormLayout>
                  <FormTextInput
                    control={control}
                    name="name"
                    label={t("fields.name")}
                    isRequired
                  />
                  <FormSelector
                    control={control}
                    name="kind"
                    label={t("fields.kind")}
                    options={EVENT_KINDS.map((kind) => ({
                      value: kind,
                      label: t(`kinds.${kind}`),
                    }))}
                  />
                  <FormSelector
                    control={control}
                    name="siteId"
                    label={t("fields.site")}
                    options={[
                      {value: "", label: t("shared")},
                      ...activeSites.map((site) => ({
                        value: site.id,
                        label: `${site.code} · ${site.name}`,
                      })),
                    ]}
                  />
                  <FormDateInput
                    control={control}
                    name="startsOn"
                    label={t("fields.startsOn")}
                    isRequired
                  />
                  <FormDateInput
                    control={control}
                    name="endsOn"
                    label={t("fields.endsOn")}
                    isRequired
                  />
                  <FormTextInput
                    control={control}
                    name="expectedUpliftPct"
                    label={t("fields.expectedUpliftPct")}
                    description={t("fields.expectedUpliftPctHint")}
                  />
                  <FormTextArea
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
        </Dialog>
      ) : null}

      <Stack gap={3}>
        <HStack justify="between" align="end" wrap="wrap" gap={3}>
          <Heading level={2}>{t("listTitle")}</Heading>
          {canWrite ? (
            <Button
              variant="primary"
              label={t("createTitle")}
              onClick={() => setCreateOpen(true)}
            />
          ) : null}
        </HStack>

        {error ? (
          <Banner status="error" title={t("errorTitle")} description={error} />
        ) : null}

        {events.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<EventRecord>
            data={events}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "name",
                header: t("columns.name"),
                width: proportional(3),
                renderCell: (item) => item.name,
              },
              {
                key: "kind",
                header: t("columns.kind"),
                width: proportional(1),
                renderCell: (item) => t(`kinds.${item.kind}`),
              },
              {
                key: "site",
                header: t("columns.site"),
                width: proportional(2),
                renderCell: (item) => item.siteName ?? t("shared"),
              },
              {
                key: "dates",
                header: t("columns.dates"),
                width: proportional(3),
                renderCell: (item) =>
                  `${formatBusinessDate(item.startsOn, {locale})} → ${formatBusinessDate(item.endsOn, {locale})}`,
              },
              {
                key: "uplift",
                header: t("columns.uplift"),
                width: pixel(100),
                align: "end",
                renderCell: (item) =>
                  item.expectedUpliftPct
                    ? formatPercent(item.expectedUpliftPct, {locale})
                    : "—",
              },
              {
                key: "status",
                header: t("columns.status"),
                width: proportional(1),
                renderCell: (item) => (
                  <Badge
                    label={item.archivedAt ? t("archived") : t("active")}
                    variant={item.archivedAt ? "neutral" : "success"}
                  />
                ),
              },
              {
                key: "actions",
                header: "",
                width: pixel(110),
                renderCell: (item) =>
                  canWrite && !item.archivedAt ? (
                    <Button
                      label={t("archive")}
                      variant="ghost"
                      size="sm"
                      isLoading={pendingId === item.id}
                      onClick={() => archive(item)}
                    />
                  ) : null,
              },
            ]}
          />
        )}
      </Stack>
    </Stack>
  );
}
