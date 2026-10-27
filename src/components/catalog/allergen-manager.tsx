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
  addItemAllergenAction,
  removeItemAllergenAction,
} from "@/app/actions/catalog.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import type {
  AllergenOption,
  ItemAllergenRecord,
} from "@/lib/dto";
import {
  ALLERGEN_PRESENCES,
  itemAllergenSchema,
  type ItemAllergenValues,
} from "@/server/validators/catalog.schema";

export function AllergenManager({
  itemId,
  allergens,
  options,
  canWrite,
}: {
  itemId: string;
  allergens: ItemAllergenRecord[];
  options: AllergenOption[];
  canWrite: boolean;
}) {
  const t = useTranslations("Catalog.allergens");
  const tValidation = useTranslations("Catalog.validation");
  const tErrors = useTranslations("Catalog.errors");
  const locale = useLocale();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => itemAllergenSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<ItemAllergenValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemId,
      allergenId: "",
      presence: "CONTAINS",
      note: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  const labelFor = (allergen: {labelEn: string; labelFr: string}) =>
    locale === "fr" ? allergen.labelFr : allergen.labelEn;

  async function onSubmit(values: ItemAllergenValues) {
    setError(null);
    const result = await addItemAllergenAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset({itemId, allergenId: "", presence: "CONTAINS", note: ""});
    router.refresh();
  }

  async function remove(allergen: ItemAllergenRecord) {
    setError(null);
    setPendingId(allergen.id);

    try {
      const result = await removeItemAllergenAction({id: allergen.id});
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
    <Stack gap={4}>
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
                  name="allergenId"
                  label={t("allergen")}
                  options={[
                    {value: "", label: t("choose")},
                    ...options.map((allergen) => ({
                      value: allergen.id,
                      label: labelFor(allergen),
                    })),
                  ]}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="presence"
                  label={t("presence")}
                  options={ALLERGEN_PRESENCES.map((presence) => ({
                    value: presence,
                    label: t(`presences.${presence}`),
                  }))}
                />
                <FormTextInput
                  control={control}
                  name="note"
                  label={t("note")}
                />
              </FormLayout>

              <Button
                type="submit"
                variant="primary"
                label={t("add")}
                isLoading={isSubmitting}
              />
            </Stack>
          </form>
        </Card>
      ) : null}

      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      {allergens.length === 0 ? (
        <Card padding={4}>
          <EmptyState title={t("emptyTitle")} description={t("emptyBody")} isCompact />
        </Card>
      ) : (
        <Table<ItemAllergenRecord>
          data={allergens}
          idKey="id"
          density="compact"
          columns={[
            {
              key: "allergen",
              header: t("allergen"),
              width: proportional(2),
              renderCell: (allergen) => labelFor(allergen),
            },
            {
              key: "presence",
              header: t("presence"),
              width: proportional(1),
              renderCell: (allergen) => (
                <Badge
                  label={t(`presences.${allergen.presence}`)}
                  variant={
                    allergen.presence === "CONTAINS" ? "warning" : "neutral"
                  }
                />
              ),
            },
            {
              key: "note",
              header: t("note"),
              width: proportional(3),
              renderCell: (allergen) => allergen.note ?? "—",
            },
            {
              key: "actions",
              header: "",
              width: pixel(140),
              renderCell: (allergen) =>
                canWrite ? (
                  <HStack gap={2}>
                    <Button
                      label={t("remove")}
                      variant="ghost"
                      size="sm"
                      isLoading={pendingId === allergen.id}
                      onClick={() => remove(allergen)}
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
