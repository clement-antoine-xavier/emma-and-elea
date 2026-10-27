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
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {createSupplierAction} from "@/app/actions/supplier.actions";
import {FormTextInput} from "@/components/form-text-input";
import type {SupplierListRecord} from "@/lib/dto";
import {
  supplierInputSchema,
  type SupplierInputValues,
} from "@/server/validators/supplier.schema";

export function SupplierManager({
  suppliers,
  canWrite,
}: {
  suppliers: SupplierListRecord[];
  canWrite: boolean;
}) {
  const t = useTranslations("Suppliers");
  const tValidation = useTranslations("Suppliers.validation");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => supplierInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<SupplierInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      name: "",
      contactName: "",
      email: "",
      phone: "",
      city: "",
      defaultLeadTimeDays: "",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: SupplierInputValues) {
    setError(null);
    const result = await createSupplierAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset();
    if (result.supplierId) {
      router.push(`/dashboard/purchasing/suppliers/${result.supplierId}`);
      router.refresh();
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

        {suppliers.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<SupplierListRecord>
            data={suppliers}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "code",
                header: t("columns.code"),
                width: pixel(120),
                renderCell: (supplier) => supplier.code,
              },
              {
                key: "name",
                header: t("columns.name"),
                width: proportional(3),
                renderCell: (supplier) => (
                  <Stack gap={0}>
                    <Text weight="semibold">{supplier.name}</Text>
                    <Text type="supporting" color="secondary">
                      {supplier.contactName ?? "—"}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: "city",
                header: t("columns.city"),
                width: proportional(2),
                renderCell: (supplier) => supplier.city ?? "—",
              },
              {
                key: "items",
                header: t("columns.items"),
                width: pixel(80),
                align: "end",
                renderCell: (supplier) => String(supplier.activeItemCount),
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(110),
                renderCell: (supplier) => (
                  <Badge
                    label={supplier.isArchived ? t("archived") : t("active")}
                    variant={supplier.isArchived ? "neutral" : "success"}
                  />
                ),
              },
              {
                key: "actions",
                header: "",
                width: pixel(110),
                renderCell: (supplier) => (
                  <Button
                    label={t("open")}
                    variant="ghost"
                    size="sm"
                    href={`/dashboard/purchasing/suppliers/${supplier.id}`}
                  />
                ),
              },
            ]}
          />
        )}
      </Stack>
    </Stack>
  );
}
