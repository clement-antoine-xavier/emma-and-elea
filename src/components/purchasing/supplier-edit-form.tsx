"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {updateSupplierAction} from "@/app/actions/supplier.actions";
import {FormTextInput} from "@/components/form-text-input";
import type {SupplierDetailRecord} from "@/lib/dto";
import {
  supplierInputSchema,
  type SupplierInputValues,
} from "@/server/validators/supplier.schema";

export function SupplierEditForm({supplier}: {supplier: SupplierDetailRecord}) {
  const t = useTranslations("Suppliers");
  const tValidation = useTranslations("Suppliers.validation");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const schema = useMemo(
    () => supplierInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError,
    formState: {errors, isSubmitting},
  } = useForm<SupplierInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: supplier.code,
      name: supplier.name,
      contactName: supplier.contactName ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      city: supplier.city ?? "",
      defaultLeadTimeDays:
        supplier.defaultLeadTimeDays === null
          ? ""
          : String(supplier.defaultLeadTimeDays),
      note: supplier.note ?? "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: SupplierInputValues) {
    setSaved(false);
    const result = await updateSupplierAction(supplier.id, values);

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
            <Text type="supporting">{t("editIntro", {code: supplier.code})}</Text>
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
            <FormTextInput
              control={control}
              name="contactName"
              label={t("fields.contactName")}
            />
            <FormTextInput
              control={control}
              name="email"
              label={t("fields.email")}
              type="email"
            />
            <FormTextInput
              control={control}
              name="phone"
              label={t("fields.phone")}
            />
            <FormTextInput
              control={control}
              name="city"
              label={t("fields.city")}
            />
            <FormTextInput
              control={control}
              name="defaultLeadTimeDays"
              label={t("fields.leadTime")}
              description={t("fields.leadTimeHint")}
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
            label={t("save")}
            isLoading={isSubmitting}
          />
        </Stack>
      </form>
    </Card>
  );
}
