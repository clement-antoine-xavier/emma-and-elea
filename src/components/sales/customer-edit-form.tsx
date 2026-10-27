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
import {updateCustomerAction} from "@/app/actions/customer.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import type {CustomerRecord} from "@/lib/dto";
import {
  CUSTOMER_TYPES,
  customerInputSchema,
  type CustomerInputValues,
} from "@/server/validators/customer.schema";

export function CustomerEditForm({customer}: {customer: CustomerRecord}) {
  const t = useTranslations("Sales.customers");
  const tEdit = useTranslations("Sales.customerEdit");
  const tTypes = useTranslations("Sales.types");
  const tValidation = useTranslations("Sales.validation");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const schema = useMemo(
    () => customerInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<CustomerInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: customer.code ?? "",
      name: customer.name,
      type: customer.type,
      contactName: customer.contactName ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      city: customer.city ?? "",
      vatNumber: customer.vatNumber ?? "",
      note: customer.note ?? "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: CustomerInputValues) {
    setSaved(false);
    const result = await updateCustomerAction(customer.id, values);
    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
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
            <Heading level={2}>{tEdit("title")}</Heading>
            <Text type="supporting">{tEdit("intro")}</Text>
          </Stack>

          {saved ? (
            <Banner
              status="success"
              title={tEdit("savedTitle")}
              description={tEdit("savedBody")}
            />
          ) : null}

          {errors.root?.message ? (
            <Banner
              status="error"
              title={tEdit("errorTitle")}
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
            />
            <FormSelector
              control={control}
              name="type"
              label={t("fields.type")}
              options={CUSTOMER_TYPES.map((type) => ({
                value: type,
                label: tTypes(type === "BUSINESS" ? "BUSINESS" : "INDIVIDUAL"),
              }))}
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
              name="vatNumber"
              label={t("fields.vatNumber")}
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
            label={tEdit("submit")}
            isLoading={isSubmitting}
          />
        </Stack>
      </form>
    </Card>
  );
}
