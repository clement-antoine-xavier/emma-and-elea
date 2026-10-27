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
  archiveSiteAction,
  createSiteAction,
} from "@/app/actions/site.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {
  createSiteSchema,
  SITE_KINDS,
  type CreateSiteValues,
} from "@/server/validators/site.schema";
import type {SiteRecord} from "@/lib/dto";

export function SiteManager({
  sites,
  canWrite,
}: {
  sites: SiteRecord[];
  canWrite: boolean;
}) {
  const t = useTranslations("Sites");
  const tValidation = useTranslations("Sites.validation");
  const tErrors = useTranslations("Settings.errors");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => createSiteSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<CreateSiteValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      kind: "WORKSHOP",
      city: "",
      timezone: "Europe/Paris",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: CreateSiteValues) {
    setError(null);
    const result = await createSiteAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset();
    router.refresh();
  }

  async function archive(site: SiteRecord) {
    setError(null);
    setPendingId(site.id);

    try {
      const result = await archiveSiteAction({id: site.id});
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  const kindLabel = (kind: SiteRecord["kind"]) => t(`kinds.${kind}`);

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
                <FormTextInput
                  control={control}
                  name="code"
                  label={t("fields.code")}
                  description={t("fields.codeHint")}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="kind"
                  label={t("fields.kind")}
                  options={SITE_KINDS.map((kind) => ({
                    value: kind,
                    label: kindLabel(kind),
                  }))}
                />
                <FormTextInput
                  control={control}
                  name="city"
                  label={t("fields.city")}
                />
                <FormTextInput
                  control={control}
                  name="timezone"
                  label={t("fields.timezone")}
                  description={t("fields.timezoneHint")}
                  isRequired
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

        {sites.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<SiteRecord>
            data={sites}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "code",
                header: t("columns.code"),
                width: proportional(1, {minWidth: 60}),
                renderCell: (site) => <Text weight="semibold">{site.code}</Text>,
              },
              {
                key: "name",
                header: t("columns.name"),
                width: proportional(3),
                renderCell: (site) => site.name,
              },
              {
                key: "kind",
                header: t("columns.kind"),
                width: proportional(1, {minWidth: 90}),
                renderCell: (site) => kindLabel(site.kind),
              },
              {
                key: "city",
                header: t("columns.city"),
                width: proportional(1),
                renderCell: (site) => site.city ?? "—",
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(100),
                renderCell: (site) => (
                  <Badge
                    label={site.archivedAt ? t("archived") : t("active")}
                    variant={site.archivedAt ? "neutral" : "success"}
                  />
                ),
              },
              {
                key: "actions",
                header: "",
                width: pixel(220),
                renderCell: (site) =>
                  canWrite ? (
                    <HStack gap={2}>
                      <Button
                        label={t("edit")}
                        variant="ghost"
                        size="sm"
                        href={`/dashboard/settings/sites/${site.id}`}
                      />
                      {site.archivedAt ? null : (
                        <Button
                          label={t("archive")}
                          variant="ghost"
                          size="sm"
                          isLoading={pendingId === site.id}
                          onClick={() => archive(site)}
                        />
                      )}
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
