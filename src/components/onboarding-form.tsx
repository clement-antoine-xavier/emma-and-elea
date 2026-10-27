"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm, useWatch} from "react-hook-form";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {FormTextInput} from "@/components/form-text-input";
import {createOrganizationAction} from "@/app/actions/organization.actions";
import {slugifyOrganizationName} from "@/lib/slug";
import {siteCodeFromName} from "@/lib/site-code";
import {
  createOrganizationSchema,
  type CreateOrganizationValues,
} from "@/server/validators/organization.schema";

export function OnboardingForm() {
  const router = useRouter();
  const t = useTranslations("Onboarding");
  const tValidation = useTranslations("Onboarding.validation");

  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [isSiteNameEdited, setIsSiteNameEdited] = useState(false);
  const [isSiteCodeEdited, setIsSiteCodeEdited] = useState(false);
  const autoSlug = useRef("");
  const autoSiteName = useRef("");
  const autoSiteCode = useRef("");

  const schema = useMemo(
    () => createOrganizationSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: {errors, isSubmitting},
  } = useForm<CreateOrganizationValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      siteName: "",
      siteCode: "ATL",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  const name = useWatch({control, name: "name"});
  const siteName = useWatch({control, name: "siteName"});

  useEffect(() => {
    if (isSlugEdited) return;

    const generated = slugifyOrganizationName(name ?? "");

    if (generated !== autoSlug.current) {
      autoSlug.current = generated;
      setValue("slug", generated, {shouldValidate: false});
    }
  }, [isSlugEdited, name, setValue]);

  // The first site defaults to the business name and its code to the first
  // three letters; both stay editable, and editing either one stops the sync.
  useEffect(() => {
    if (isSiteNameEdited) return;

    const generated = name?.trim() ?? "";

    if (generated !== autoSiteName.current) {
      autoSiteName.current = generated;
      setValue("siteName", generated, {shouldValidate: false});
    }
  }, [isSiteNameEdited, name, setValue]);

  useEffect(() => {
    if (isSiteCodeEdited) return;

    const generated = siteCodeFromName(siteName || name || "");

    if (generated !== autoSiteCode.current) {
      autoSiteCode.current = generated;
      setValue("siteCode", generated, {shouldValidate: false});
    }
  }, [isSiteCodeEdited, name, siteName, setValue]);

  async function onSubmit(values: CreateOrganizationValues) {
    clearErrors("root");

    const result = await createOrganizationAction({
      name: values.name,
      slug: values.slug,
      siteName: values.siteName,
      siteCode: values.siteCode,
    });

    if (!result.ok) {
      if (result.error === "slugTaken") {
        setError("slug", {type: "server", message: t("errors.slugTaken")});
        return;
      }

      setError("root", {
        type: "server",
        message: t("errors.generic"),
      });
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card padding={6} width="100%">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap={5}>
          <Stack gap={1}>
            <Heading level={1}>{t("title")}</Heading>
            <Text type="supporting">{t("subtitle")}</Text>
          </Stack>

          {errors.root?.message ? (
            <Banner
              status="error"
              title={t("errors.bannerTitle")}
              description={errors.root.message}
            />
          ) : null}

          <FormLayout>
            <FormTextInput
              control={control}
              name="name"
              label={t("fields.name")}
              autoComplete="organization"
              isRequired
            />
            <FormTextInput
              control={control}
              name="slug"
              label={t("fields.slug")}
              description={t("fields.slugHint")}
              autoComplete="off"
              isRequired
              onValueChange={() => setIsSlugEdited(true)}
            />
          </FormLayout>

          <Stack gap={3}>
            <Stack gap={1}>
              <Heading level={2}>{t("siteTitle")}</Heading>
              <Text type="supporting">{t("siteSubtitle")}</Text>
            </Stack>

            <FormLayout>
              <FormTextInput
                control={control}
                name="siteName"
                label={t("fields.siteName")}
                description={t("fields.siteNameHint")}
                autoComplete="off"
                isRequired
                onValueChange={() => setIsSiteNameEdited(true)}
              />
              <FormTextInput
                control={control}
                name="siteCode"
                label={t("fields.siteCode")}
                description={t("fields.siteCodeHint")}
                autoComplete="off"
                isRequired
                onValueChange={() => setIsSiteCodeEdited(true)}
              />
            </FormLayout>
          </Stack>

          <Button
            variant="primary"
            label={t("submit")}
            type="submit"
            width="100%"
            isLoading={isSubmitting}
          />
        </Stack>
      </form>
    </Card>
  );
}
