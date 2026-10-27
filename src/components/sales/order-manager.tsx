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
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {createOrderAction} from "@/app/actions/sales.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatBusinessDate, formatMoney} from "@/lib/format";
import type {OrderSummaryRecord, SalesOptions} from "@/lib/dto";
import {
  orderInputSchema,
  type OrderInputValues,
} from "@/server/validators/sales.schema";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OrderManager({
  orders,
  options,
  canWrite,
}: {
  orders: OrderSummaryRecord[];
  options: Pick<SalesOptions, "customers" | "sites">;
  canWrite: boolean;
}) {
  const t = useTranslations("Sales.orders");
  const tStatuses = useTranslations("Sales.statuses");
  const tValidation = useTranslations("Sales.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => orderInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<OrderInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: options.customers[0]?.id ?? "",
      siteId: options.sites[0]?.id ?? "",
      requestedFor: todayIso(),
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: OrderInputValues) {
    setError(null);
    const result = await createOrderAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    if (result.orderId) {
      router.push(`/dashboard/sales/orders/${result.orderId}`);
      router.refresh();
    }
  }

  return (
    <Stack gap={6}>
      {canWrite && options.customers.length > 0 ? (
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
                <FormSelector
                  control={control}
                  name="customerId"
                  label={t("fields.customer")}
                  options={options.customers.map((customer) => ({
                    value: customer.id,
                    label: customer.code
                      ? `${customer.code} · ${customer.name}`
                      : customer.name,
                  }))}
                  isRequired
                />
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
                <FormDateInput
                  control={control}
                  name="requestedFor"
                  label={t("fields.requestedFor")}
                  isRequired
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

      {canWrite && options.customers.length === 0 ? (
        <Banner
          status="info"
          title={t("noCustomerTitle")}
          description={t("noCustomerBody")}
        />
      ) : null}

      <Stack gap={3}>
        <Heading level={2}>{t("listTitle")}</Heading>
        {error ? (
          <Banner status="error" title={t("errorTitle")} description={error} />
        ) : null}

        {orders.length === 0 ? (
          <Card padding={4}>
            <EmptyState title={t("emptyTitle")} description={t("emptyBody")} isCompact />
          </Card>
        ) : (
          <Table<OrderSummaryRecord>
            data={orders}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "number",
                header: t("columns.number"),
                width: pixel(150),
                renderCell: (order) => order.number,
              },
              {
                key: "customer",
                header: t("columns.customer"),
                width: proportional(3),
                renderCell: (order) => (
                  <Stack gap={0}>
                    <Text weight="semibold">{order.customerName}</Text>
                    <Text type="supporting" color="secondary">
                      {order.siteName}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(130),
                renderCell: (order) => (
                  <Badge
                    label={tStatuses(order.status)}
                    variant={
                      order.status === "DELIVERED"
                        ? "success"
                        : order.status === "CANCELLED"
                          ? "neutral"
                          : order.status === "DRAFT"
                            ? "warning"
                            : "neutral"
                    }
                  />
                ),
              },
              {
                key: "requestedFor",
                header: t("columns.requestedFor"),
                width: pixel(140),
                renderCell: (order) =>
                  formatBusinessDate(order.requestedFor, {locale}),
              },
              {
                key: "total",
                header: t("columns.total"),
                width: pixel(120),
                align: "end",
                renderCell: (order) =>
                  formatMoney(order.totalAmount, {
                    locale,
                    currency: order.currency,
                  }),
              },
              {
                key: "actions",
                header: "",
                width: pixel(100),
                renderCell: (order) => (
                  <Button
                    label={t("open")}
                    variant="ghost"
                    size="sm"
                    href={`/dashboard/sales/orders/${order.id}`}
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
