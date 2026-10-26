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
import {useRouter} from "@/i18n/navigation";
import {authClient} from "@/lib/auth-client";
import {FormTextInput} from "@/components/form-text-input";
import {
  createOrganizationSchema,
  slugifyOrganizationName,
  type CreateOrganizationValues,
} from "@/lib/validation/organization";

export function OnboardingForm() {
  const router = useRouter();
  const t = useTranslations("Onboarding");
  const tValidation = useTranslations("Onboarding.validation");
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const autoSlug = useRef("");

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
    defaultValues: {name: "", slug: ""},
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  const name = useWatch({control, name: "name"});

  useEffect(() => {
    if (isSlugEdited) return;

    const generated = slugifyOrganizationName(name ?? "");

    if (generated !== autoSlug.current) {
      autoSlug.current = generated;
      setValue("slug", generated, {shouldValidate: false});
    }
  }, [isSlugEdited, name, setValue]);

  async function onSubmit(values: CreateOrganizationValues) {
    clearErrors("root");

    const {error} = await authClient.organization.create({
      name: values.name,
      slug: values.slug,
    });

    if (error) {
      if (error.code === "ORGANIZATION_SLUG_ALREADY_TAKEN") {
        setError("slug", {type: "server", message: t("errors.slugTaken")});
        return;
      }

      setError("root", {
        type: "server",
        message: error.message ?? t("errors.generic"),
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
