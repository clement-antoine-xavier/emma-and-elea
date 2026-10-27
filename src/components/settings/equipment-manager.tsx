"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Badge} from "@astryxdesign/core/Badge";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  archiveEquipmentAction,
  createEquipmentAction,
} from "@/app/actions/equipment.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatQuantity} from "@/lib/format";
import {
  createEquipmentSchema,
  EQUIPMENT_KINDS,
  type CreateEquipmentValues,
} from "@/server/validators/equipment.schema";
import type {
  EquipmentRecord,
  SiteRecord,
} from "@/lib/dto";
import {useLocale} from "next-intl";

export function EquipmentManager({
  equipment,
  sites,
  canWrite,
}: {
  equipment: EquipmentRecord[];
  sites: SiteRecord[];
  canWrite: boolean;
}) {
  const t = useTranslations("Equipment");
  const tValidation = useTranslations("Equipment.validation");
  const tErrors = useTranslations("Settings.errors");
  const locale = useLocale();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => createEquipmentSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<CreateEquipmentValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      kind: "OVEN",
      siteId: "",
      powerKw: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  const activeSites = sites.filter((site) => !site.archivedAt);

  async function onSubmit(values: CreateEquipmentValues) {
    setError(null);
    const result = await createEquipmentAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset();
    router.refresh();
  }

  async function archive(item: EquipmentRecord) {
    setError(null);
    setPendingId(item.id);

    try {
      const result = await archiveEquipmentAction({id: item.id});
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
        <Card padding={5}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack gap={4}>
              <Stack gap={1}>
                <Heading level={2}>{t("createTitle")}</Heading>
                <Text type="supporting">{t("createIntro")}</Text>
              </Stack>

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
                  options={EQUIPMENT_KINDS.map((kind) => ({
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
                <FormTextInput
                  control={control}
                  name="powerKw"
                  label={t("fields.powerKw")}
                  description={t("fields.powerKwHint")}
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

      <Stack gap={3}>
        <Heading level={2}>{t("listTitle")}</Heading>

        {error ? (
          <Banner status="error" title={t("errorTitle")} description={error} />
        ) : null}

        {equipment.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<EquipmentRecord>
            data={equipment}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "name",
                header: t("columns.name"),
                width: proportional(2),
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
                key: "power",
                header: t("columns.powerKw"),
                width: proportional(1),
                align: "end",
                renderCell: (item) =>
                  item.powerKw
                    ? `${formatQuantity(item.powerKw, {locale, maximumFractionDigits: 3})} kW`
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
                    <HStack gap={2}>
                      <Button
                        label={t("archive")}
                        variant="ghost"
                        size="sm"
                        isLoading={pendingId === item.id}
                        onClick={() => archive(item)}
                      />
                    </HStack>
                  ) : null,
              },
            ]}
          />
        )}
      </Stack>
    </Stack>
  );
}
