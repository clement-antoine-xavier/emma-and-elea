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
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  closeSupplierItemAction,
  createSupplierItemAction,
} from "@/app/actions/supplier.actions";
import {FormDateInput} from "@/components/form-date-input";
import {FormSelector} from "@/components/form-selector";
import {FormSwitch} from "@/components/form-switch";
import {FormTextInput} from "@/components/form-text-input";
import {formatBusinessDate, formatMoney} from "@/lib/format";
import type {SupplierItemRecord} from "@/lib/dto";
import {
  supplierItemInputSchema,
  type SupplierItemInputValues,
} from "@/server/validators/supplier.schema";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SupplierItemManager({
  supplierId,
  items,
  itemOptions,
  units,
  canWrite,
}: {
  supplierId: string;
  items: SupplierItemRecord[];
  itemOptions: {id: string; code: string; name: string}[];
  units: {id: string; code: string; labelEn: string; labelFr: string}[];
  canWrite: boolean;
}) {
  const t = useTranslations("Suppliers.items");
  const tValidation = useTranslations("Suppliers.validation");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => supplierItemInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<SupplierItemInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemId: "",
      supplierRef: "",
      packQuantity: "",
      packUnitId: "",
      price: "",
      leadTimeDays: "",
      minOrderQuantity: "",
      isPreferred: true,
      validFrom: todayIso(),
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: SupplierItemInputValues) {
    setError(null);
    const result = await createSupplierItemAction(supplierId, values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset({
      itemId: "",
      supplierRef: "",
      packQuantity: "",
      packUnitId: "",
      price: "",
      leadTimeDays: "",
      minOrderQuantity: "",
      isPreferred: true,
      validFrom: todayIso(),
    });
    router.refresh();
  }

  async function close(item: SupplierItemRecord) {
    setError(null);
    setPendingId(item.id);

    try {
      const result = await closeSupplierItemAction({id: item.id});
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  const unitLabel = (unit: {code: string; labelEn: string; labelFr: string}) =>
    `${unit.code} · ${locale === "fr" ? unit.labelFr : unit.labelEn}`;

  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <Heading level={2}>{t("title")}</Heading>
        <Text type="supporting">{t("intro")}</Text>
      </Stack>

      {canWrite ? (
        <Card padding={5}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack gap={4}>
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
                  name="itemId"
                  label={t("fields.item")}
                  options={[
                    {value: "", label: t("chooseItem")},
                    ...itemOptions.map((item) => ({
                      value: item.id,
                      label: `${item.code} · ${item.name}`,
                    })),
                  ]}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="supplierRef"
                  label={t("fields.supplierRef")}
                />
                <FormTextInput
                  control={control}
                  name="packQuantity"
                  label={t("fields.packQuantity")}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="packUnitId"
                  label={t("fields.packUnit")}
                  options={[
                    {value: "", label: t("chooseUnit")},
                    ...units.map((unit) => ({
                      value: unit.id,
                      label: unitLabel(unit),
                    })),
                  ]}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="price"
                  label={t("fields.price")}
                  description={t("fields.priceHint")}
                  isRequired
                />
                <FormTextInput
                  control={control}
                  name="leadTimeDays"
                  label={t("fields.leadTime")}
                />
                <FormTextInput
                  control={control}
                  name="minOrderQuantity"
                  label={t("fields.minOrder")}
                />
                <FormDateInput
                  control={control}
                  name="validFrom"
                  label={t("fields.validFrom")}
                  isRequired
                />
                <FormSwitch
                  control={control}
                  name="isPreferred"
                  label={t("fields.isPreferred")}
                  description={t("fields.isPreferredHint")}
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

      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      {items.length === 0 ? (
        <Card padding={4}>
          <EmptyState title={t("emptyTitle")} description={t("emptyBody")} isCompact />
        </Card>
      ) : (
        <Table<SupplierItemRecord>
          data={items}
          idKey="id"
          density="compact"
          columns={[
            {
              key: "item",
              header: t("columns.item"),
              width: proportional(3),
              renderCell: (item) => (
                <Stack gap={0}>
                  <Text weight="semibold">{item.itemName}</Text>
                  <Text type="supporting" color="secondary">
                    {item.itemCode}
                    {item.supplierRef ? ` · ${item.supplierRef}` : ""}
                  </Text>
                </Stack>
              ),
            },
            {
              key: "pack",
              header: t("columns.pack"),
              width: proportional(1),
              renderCell: (item) =>
                `${item.packQuantity} ${item.packUnitCode}`,
            },
            {
              key: "price",
              header: t("columns.price"),
              width: pixel(120),
              align: "end",
              renderCell: (item) =>
                formatMoney(item.price, {
                  locale,
                  currency: item.currency,
                }),
            },
            {
              key: "validFrom",
              header: t("columns.validFrom"),
              width: pixel(130),
              renderCell: (item) =>
                formatBusinessDate(item.validFrom, {locale}),
            },
            {
              key: "status",
              header: t("columns.status"),
              width: pixel(120),
              renderCell: (item) => (
                <Badge
                  label={
                    item.isArchived
                      ? t("closed")
                      : item.isPreferred
                        ? t("preferred")
                        : t("active")
                  }
                  variant={item.isArchived ? "neutral" : "success"}
                />
              ),
            },
            {
              key: "actions",
              header: "",
              width: pixel(110),
              renderCell: (item) =>
                canWrite && !item.isArchived ? (
                  <HStack gap={2}>
                    <Button
                      label={t("close")}
                      variant="ghost"
                      size="sm"
                      isLoading={pendingId === item.id}
                      onClick={() => close(item)}
                    />
                  </HStack>
                ) : null,
            },
          ]}
        />
      )}
    </Stack>
  );
}
