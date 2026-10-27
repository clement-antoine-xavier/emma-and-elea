"use client";

import {useEffect, useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm, useWatch} from "react-hook-form";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  createItemAction,
  updateItemAction,
} from "@/app/actions/catalog.actions";
import {FormSelector} from "@/components/form-selector";
import {FormSwitch} from "@/components/form-switch";
import {FormTextInput} from "@/components/form-text-input";
import type {
  CategoryRecord,
  ItemDetailRecord,
  UnitOption,
} from "@/lib/dto";
import {
  ITEM_TYPES,
  SALES_CHANNELS,
  itemInputSchema,
  type ItemInputValues,
} from "@/server/validators/catalog.schema";

export function ItemForm({
  mode,
  item,
  units,
  categories,
}: {
  mode: "create" | "edit";
  item?: ItemDetailRecord;
  units: UnitOption[];
  categories: CategoryRecord[];
}) {
  const t = useTranslations("Catalog.item");
  const tValidation = useTranslations("Catalog.validation");
  const tErrors = useTranslations("Catalog.errors");
  const tTypes = useTranslations("Catalog.types");
  const tChannels = useTranslations("Catalog.channels");
  const locale = useLocale();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const schema = useMemo(
    () => itemInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const defaultStockUnitId =
    item?.stockUnitId ??
    units.find((unit) => unit.code === "kg" && unit.isBase)?.id ??
    units.find((unit) => unit.isBase)?.id ??
    "";

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: {errors, isSubmitting},
  } = useForm<ItemInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? "",
      code: item?.code ?? "",
      description: item?.description ?? "",
      type: item?.type ?? "RAW_MATERIAL",
      categoryId: item?.categoryId ?? "",
      stockUnitId: defaultStockUnitId,
      saleUnitId: item?.saleUnitId ?? "",
      salePrice: item?.salePrice ?? "",
      vatRate: item?.vatRate ?? "5.50",
      shelfLifeDays:
        item?.shelfLifeDays === null || item?.shelfLifeDays === undefined
          ? ""
          : String(item.shelfLifeDays),
      minStockQuantity: item?.minStockQuantity ?? "",
      parLevelQuantity: item?.parLevelQuantity ?? "",
      defaultChannel: item?.defaultChannel ?? "RETAIL",
      isPurchasable: item?.isPurchasable ?? false,
      isProduced: item?.isProduced ?? false,
      isSellable: item?.isSellable ?? false,
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  const type = useWatch({control, name: "type"});

  // The service is authoritative, but keeping the switch in step avoids a
  // confusing "off" state for a semi-finished item that will be produced anyway.
  useEffect(() => {
    if (type === "SEMI_FINISHED") setValue("isProduced", true);
    if (type === "RAW_MATERIAL" || type === "PACKAGING") {
      setValue("isProduced", false);
    }
  }, [setValue, type]);

  const unitLabel = (unit: UnitOption) =>
    `${unit.code} · ${locale === "fr" ? unit.labelFr : unit.labelEn}`;

  const baseUnits = units.filter((unit) => unit.isBase);
  const activeCategories = categories.filter((category) => !category.isArchived);

  async function onSubmit(values: ItemInputValues) {
    setSaved(false);

    const result =
      mode === "create"
        ? await createItemAction(values)
        : await updateItemAction(item?.id, values);

    if (!result.ok) {
      setError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    if (mode === "create" && result.itemId) {
      router.push(`/dashboard/catalog/items/${result.itemId}`);
      router.refresh();
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <Card padding={5}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap={5}>
          <Stack gap={1}>
            <Heading level={2}>
              {mode === "create" ? t("createTitle") : t("editTitle")}
            </Heading>
            <Text type="supporting">
              {mode === "create" ? t("createIntro") : t("editIntro")}
            </Text>
          </Stack>

          {saved ? <Banner status="success" title={t("saved")} /> : null}

          {errors.root?.message ? (
            <Banner
              status="error"
              title={t("errorTitle")}
              description={errors.root.message}
            />
          ) : null}

          <Stack gap={3}>
            <Heading level={3}>{t("sections.identity")}</Heading>
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
                name="description"
                label={t("fields.description")}
              />
              <FormSelector
                control={control}
                name="type"
                label={t("fields.type")}
                options={ITEM_TYPES.map((itemType) => ({
                  value: itemType,
                  label: tTypes(itemType),
                }))}
              />
              <FormSelector
                control={control}
                name="categoryId"
                label={t("fields.category")}
                options={[
                  {value: "", label: t("fields.noCategory")},
                  ...activeCategories.map((category) => ({
                    value: category.id,
                    label: category.parentName
                      ? `${category.parentName} · ${category.name}`
                      : category.name,
                  })),
                ]}
              />
            </FormLayout>
          </Stack>

          <Stack gap={3}>
            <Heading level={3}>{t("sections.units")}</Heading>
            <FormLayout>
              <FormSelector
                control={control}
                name="stockUnitId"
                label={t("fields.stockUnit")}
                description={t("fields.stockUnitHint")}
                options={baseUnits.map((unit) => ({
                  value: unit.id,
                  label: unitLabel(unit),
                }))}
                isRequired
              />
              <FormSelector
                control={control}
                name="saleUnitId"
                label={t("fields.saleUnit")}
                description={t("fields.saleUnitHint")}
                options={[
                  {value: "", label: t("fields.noSaleUnit")},
                  ...units.map((unit) => ({
                    value: unit.id,
                    label: unitLabel(unit),
                  })),
                ]}
              />
              <FormTextInput
                control={control}
                name="salePrice"
                label={t("fields.salePrice")}
                description={t("fields.salePriceHint")}
              />
            </FormLayout>
          </Stack>

          <Stack gap={3}>
            <Heading level={3}>{t("sections.stock")}</Heading>
            <FormLayout>
              <FormTextInput
                control={control}
                name="vatRate"
                label={t("fields.vatRate")}
                description={t("fields.vatRateHint")}
                isRequired
              />
              <FormTextInput
                control={control}
                name="shelfLifeDays"
                label={t("fields.shelfLifeDays")}
              />
              <FormTextInput
                control={control}
                name="minStockQuantity"
                label={t("fields.minStockQuantity")}
              />
              <FormTextInput
                control={control}
                name="parLevelQuantity"
                label={t("fields.parLevelQuantity")}
              />
              <FormSelector
                control={control}
                name="defaultChannel"
                label={t("fields.defaultChannel")}
                description={t("fields.defaultChannelHint")}
                options={SALES_CHANNELS.map((channel) => ({
                  value: channel,
                  label: tChannels(channel),
                }))}
              />
            </FormLayout>
          </Stack>

          <Stack gap={3}>
            <Heading level={3}>{t("sections.flags")}</Heading>
            <FormSwitch
              control={control}
              name="isPurchasable"
              label={t("fields.isPurchasable")}
              description={t("fields.isPurchasableHint")}
            />
            <FormSwitch
              control={control}
              name="isProduced"
              label={t("fields.isProduced")}
              description={t("fields.isProducedHint")}
              isDisabled={type === "SEMI_FINISHED"}
            />
            <FormSwitch
              control={control}
              name="isSellable"
              label={t("fields.isSellable")}
              description={t("fields.isSellableHint")}
            />
          </Stack>

          <Button
            type="submit"
            variant="primary"
            label={mode === "create" ? t("submitCreate") : t("submitSave")}
            isLoading={isSubmitting}
          />
        </Stack>
      </form>
    </Card>
  );
}
