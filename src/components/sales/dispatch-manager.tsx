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
import {createDispatchAction} from "@/app/actions/sales.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import {formatBusinessDate} from "@/lib/format";
import type {DispatchSummaryRecord} from "@/lib/dto";
import {
  dispatchInputSchema,
  type DispatchInputValues,
} from "@/server/validators/sales.schema";

export function DispatchManager({
  dispatches,
  customers,
  sites,
  orders,
  canWrite,
}: {
  dispatches: DispatchSummaryRecord[];
  customers: {id: string; name: string; code: string | null}[];
  sites: {id: string; name: string; code: string}[];
  orders: {id: string; number: string; customerName: string}[];
  canWrite: boolean;
}) {
  const t = useTranslations("Sales.dispatches");
  const tStatuses = useTranslations("Sales.statuses");
  const tValidation = useTranslations("Sales.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => dispatchInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<DispatchInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      siteId: sites[0]?.id ?? "",
      customerId: "",
      orderId: "",
      carrier: "",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: DispatchInputValues) {
    setError(null);
    const result = await createDispatchAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    if (result.dispatchId) {
      router.push(`/dashboard/sales/dispatches/${result.dispatchId}`);
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
                <FormSelector
                  control={control}
                  name="siteId"
                  label={t("fields.site")}
                  options={sites.map((site) => ({
                    value: site.id,
                    label: `${site.code} · ${site.name}`,
                  }))}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="customerId"
                  label={t("fields.customer")}
                  options={[
                    {value: "", label: t("noCustomer")},
                    ...customers.map((customer) => ({
                      value: customer.id,
                      label: customer.code
                        ? `${customer.code} · ${customer.name}`
                        : customer.name,
                    })),
                  ]}
                />
                <FormSelector
                  control={control}
                  name="orderId"
                  label={t("fields.order")}
                  options={[
                    {value: "", label: t("noOrder")},
                    ...orders.map((order) => ({
                      value: order.id,
                      label: `${order.number} · ${order.customerName}`,
                    })),
                  ]}
                />
                <FormTextInput
                  control={control}
                  name="carrier"
                  label={t("fields.carrier")}
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

        {dispatches.length === 0 ? (
          <Card padding={4}>
            <EmptyState title={t("emptyTitle")} description={t("emptyBody")} isCompact />
          </Card>
        ) : (
          <Table<DispatchSummaryRecord>
            data={dispatches}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "number",
                header: t("columns.number"),
                width: pixel(150),
                renderCell: (dispatch) => dispatch.number,
              },
              {
                key: "customer",
                header: t("columns.customer"),
                width: proportional(3),
                renderCell: (dispatch) => (
                  <Stack gap={0}>
                    <Text weight="semibold">
                      {dispatch.customerName ?? "—"}
                    </Text>
                    <Text type="supporting" color="secondary">
                      {dispatch.siteName}
                      {dispatch.orderNumber
                        ? ` · ${dispatch.orderNumber}`
                        : ""}
                    </Text>
                  </Stack>
                ),
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(130),
                renderCell: (dispatch) => (
                  <Badge
                    label={tStatuses(dispatch.status)}
                    variant={
                      dispatch.status === "DISPATCHED"
                        ? "success"
                        : dispatch.status === "CANCELLED"
                          ? "neutral"
                          : "warning"
                    }
                  />
                ),
              },
              {
                key: "dispatchedAt",
                header: t("columns.dispatchedAt"),
                width: pixel(140),
                renderCell: (dispatch) =>
                  dispatch.dispatchedAt
                    ? formatBusinessDate(dispatch.dispatchedAt, {locale})
                    : "—",
              },
              {
                key: "actions",
                header: "",
                width: pixel(100),
                renderCell: (dispatch) => (
                  <Button
                    label={t("open")}
                    variant="ghost"
                    size="sm"
                    href={`/dashboard/sales/dispatches/${dispatch.id}`}
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
