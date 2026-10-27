"use client";

import {useMemo} from "react";
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
import {createReceiptDraftAction} from "@/app/actions/purchasing.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {
  receiptDraftSchema,
  type ReceiptDraftValues,
} from "@/server/validators/purchasing.schema";
import type {ReceiptFormOptions} from "@/lib/dto";

export function ReceiptForm({options}: {options: ReceiptFormOptions}) {
  const t = useTranslations("Purchasing.form");
  const tValidation = useTranslations("Purchasing.validation");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();

  const schema = useMemo(
    () => receiptDraftSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError,
    formState: {errors, isSubmitting},
  } = useForm<ReceiptDraftValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      siteId: options.sites[0]?.id ?? "",
      supplierId: options.suppliers[0]?.id ?? "",
      supplierReference: "",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: ReceiptDraftValues) {
    const result = await createReceiptDraftAction(values);

    if (!result.ok) {
      setError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    if (result.receiptId) {
      router.push(`/dashboard/purchasing/receipts/${result.receiptId}`);
      router.refresh();
    }
  }

  return (
    <Card padding={5}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap={4}>
          <Stack gap={1}>
            <Heading level={2}>{t("title")}</Heading>
            <Text type="supporting">{t("intro")}</Text>
          </Stack>

          {errors.root?.message ? (
            <Banner
              status="error"
              title={t("errorTitle")}
              description={errors.root.message}
            />
          ) : null}

          <FormLayout>
            <FormSelector
              control={control}
              name="siteId"
              label={t("fields.site")}
              options={options.sites.map((site) => ({
                value: site.id,
                label: `${site.code} · ${site.name}`,
              }))}
              isRequired
            />
            <FormSelector
              control={control}
              name="supplierId"
              label={t("fields.supplier")}
              options={options.suppliers.map((supplier) => ({
                value: supplier.id,
                label: `${supplier.code} · ${supplier.name}`,
              }))}
              isRequired
            />
            <FormTextInput
              control={control}
              name="supplierReference"
              label={t("fields.supplierReference")}
              description={t("fields.supplierReferenceHint")}
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
  );
}
