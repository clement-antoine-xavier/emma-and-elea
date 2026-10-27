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
  archiveCategoryAction,
  createCategoryAction,
} from "@/app/actions/catalog.actions";
import {FormSelector} from "@/components/form-selector";
import {FormTextInput} from "@/components/form-text-input";
import type {CategoryRecord} from "@/lib/dto";
import {
  categoryInputSchema,
  type CategoryInputValues,
} from "@/server/validators/catalog.schema";

export function CategoryManager({
  categories,
  canWrite,
}: {
  categories: CategoryRecord[];
  canWrite: boolean;
}) {
  const t = useTranslations("Catalog.categories");
  const tValidation = useTranslations("Catalog.validation");
  const tErrors = useTranslations("Catalog.errors");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => categoryInputSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<CategoryInputValues>({
    resolver: zodResolver(schema),
    defaultValues: {name: "", parentId: "", sortOrder: "0"},
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  const roots = categories.filter(
    (category) => category.parentId === null && !category.isArchived,
  );

  async function onSubmit(values: CategoryInputValues) {
    setError(null);
    const result = await createCategoryAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset({name: "", parentId: "", sortOrder: "0"});
    router.refresh();
  }

  async function archive(category: CategoryRecord) {
    setError(null);
    setPendingId(category.id);

    try {
      const result = await archiveCategoryAction({id: category.id});
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
                  label={t("name")}
                  isRequired
                />
                <FormSelector
                  control={control}
                  name="parentId"
                  label={t("parent")}
                  options={[
                    {value: "", label: t("parentNone")},
                    ...roots.map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                  ]}
                />
                <FormTextInput
                  control={control}
                  name="sortOrder"
                  label={t("sortOrder")}
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

        {categories.length === 0 ? (
          <Card padding={4}>
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyBody")}
              isCompact
            />
          </Card>
        ) : (
          <Table<CategoryRecord>
            data={categories}
            idKey="id"
            density="compact"
            columns={[
              {
                key: "name",
                header: t("columns.name"),
                width: proportional(2),
                renderCell: (category) =>
                  category.parentId ? `— ${category.name}` : category.name,
              },
              {
                key: "parent",
                header: t("columns.parent"),
                width: proportional(2),
                renderCell: (category) => category.parentName ?? "—",
              },
              {
                key: "items",
                header: t("columns.items"),
                width: pixel(90),
                align: "end",
                renderCell: (category) => String(category.itemCount),
              },
              {
                key: "children",
                header: t("columns.children"),
                width: pixel(100),
                align: "end",
                renderCell: (category) => String(category.childCount),
              },
              {
                key: "status",
                header: t("columns.status"),
                width: pixel(110),
                renderCell: (category) => (
                  <Badge
                    label={category.isArchived ? t("archived") : t("active")}
                    variant={category.isArchived ? "neutral" : "success"}
                  />
                ),
              },
              {
                key: "actions",
                header: "",
                width: pixel(150),
                renderCell: (category) =>
                  canWrite && !category.isArchived ? (
                    <HStack gap={2}>
                      <Button
                        label={t("archive")}
                        variant="ghost"
                        size="sm"
                        isLoading={pendingId === category.id}
                        onClick={() => archive(category)}
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
