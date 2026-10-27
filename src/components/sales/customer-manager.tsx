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
  archiveCustomerAction,
  createCustomerAction,
} from "@/app/actions/customer.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import type {CustomerRecord} from "@/lib/dto";
import {
  CUSTOMER_TYPES,
  customerInputSchema,
  type CustomerInputValues,
} from "@/server/validators/customer.schema";

export function CustomerManager({
  customers,
  canWrite,
}: {
  customers: CustomerRecord[];
  canWrite: boolean;
}) {
  const t = useTranslations("Sales.customers");
  const tTypes = useTranslations("Sales.types");
  const tValidation = useTranslations("Sales.validation");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const schema = useMemo(
    () => customerInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<CustomerInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      name: "",
      type: "BUSINESS",
      contactName: "",
      email: "",
      phone: "",
      city: "",
      vatNumber: "",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: CustomerInputValues) {
    setError(null);
    const result = await createCustomerAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset();
    router.refresh();
  }

  async function archive(customer: CustomerRecord) {
    setError(null);
    setPendingId(customer.id);
    try {
      const result = await archiveCustomerAction({id: customer.id});
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
                    label: tTypes(
                      type === "BUSINESS" ? "BUSINESS" : "INDIVIDUAL",
                    ),
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

        {customers.length === 0 ? (
          <Card padding={4}>
            <EmptyState title={t("emptyTitle")} description={t("emptyBody")} isCompact />
          </Card>
        ) : (
          <Table<CustomerRecord>
            data={customers}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "code",
                header: t("columns.code"),
                width: pixel(100),
                renderCell: (customer) => customer.code ?? "—",
              },
              {
                key: "name",
                header: t("columns.name"),
                width: proportional(3),
                renderCell: (customer) => (
                  <Stack gap={0}>
                    <Text weight="semibold">{customer.name}</Text>
                    <Text type="supporting" color="secondary">
                      {customer.contactName ?? "—"}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: "type",
                header: t("columns.type"),
                width: pixel(120),
                renderCell: (customer) => tTypes(customer.type),
              },
              {
                key: "city",
                header: t("columns.city"),
                width: proportional(2),
                renderCell: (customer) => customer.city ?? "—",
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(110),
                renderCell: (customer) => (
                  <Badge
                    label={customer.isArchived ? t("archived") : t("active")}
                    variant={customer.isArchived ? "neutral" : "success"}
                  />
                ),
              },
              {
                key: "actions",
                header: "",
                width: pixel(110),
                renderCell: (customer) =>
                  canWrite && !customer.isArchived ? (
                    <HStack gap={2}>
                      <Button
                        label={t("edit")}
                        variant="ghost"
                        size="sm"
                        href={`/dashboard/sales/customers/${customer.id}`}
                      />
                      <Button
                        label={t("archive")}
                        variant="ghost"
                        size="sm"
                        isLoading={pendingId === customer.id}
                        onClick={() => archive(customer)}
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
