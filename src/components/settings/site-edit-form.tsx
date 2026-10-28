"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {updateSiteAction} from "@/app/actions/site.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {
  SITE_KINDS,
  updateSiteSchema,
  type UpdateSiteValues,
} from "@/server/validators/site.schema";
import type {SiteRecord} from "@/lib/dto";

export function SiteEditForm({site}: {site: SiteRecord}) {
  const t = useTranslations("Sites");
  const tValidation = useTranslations("Sites.validation");
  const tErrors = useTranslations("Settings.errors");
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const schema = useMemo(
    () => updateSiteSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError,
    formState: {errors, isSubmitting},
  } = useForm<UpdateSiteValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: site.id,
      name: site.name,
      code: site.code,
      kind: site.kind,
      city: site.city ?? "",
      timezone: site.timezone,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: UpdateSiteValues) {
    setSaved(false);
    const result = await updateSiteAction(values);

    if (!result.ok) {
      setError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <Card padding={5}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap={4}>
          <Stack gap={1}>
            <Heading level={2}>{t("editTitle")}</Heading>
            <Text type="supporting">
              {t("editIntro", {code: site.code})}
            </Text>
          </Stack>

          {saved ? <Banner status="success" title={t("saved")} /> : null}

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
                label: t(`kinds.${kind}`),
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

          <HStack gap={3}>
            <Button
              type="submit"
              variant="primary"
              label={t("save")}
              isLoading={isSubmitting}
            />
            <Button
              label={t("backToList")}
              variant="secondary"
              href="/dashboard/settings?section=sites"
            />
          </HStack>
        </Stack>
      </form>
    </Card>
  );
}
