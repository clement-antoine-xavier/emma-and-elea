"use client";

import {useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {importDailySalesAction} from "@/app/actions/sales.actions";
import {FormTextArea} from "@/components/form-text-area";

const schema = z.object({
  csv: z.string().trim().min(1),
});

type Values = z.infer<typeof schema>;

export function DailySalesImport({canWrite}: {canWrite: boolean}) {
  const t = useTranslations("Sales.daily.import");
  const tErrors = useTranslations("Common.errors");
  const router = useRouter();
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: {errors, isSubmitting},
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {csv: ""},
    mode: "onSubmit",
  });

  async function onSubmit(values: Values) {
    setResult(null);
    setError(null);

    const response = await importDailySalesAction(values.csv);
    if (!response.ok) {
      setError(tErrors(response.error));
      return;
    }

    setResult({
      imported: response.imported,
      skipped: response.skipped,
      errors: response.errors,
    });
    reset();
    router.refresh();
  }

  if (!canWrite) return null;

  return (
    <Card padding={5}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap={4}>
          <Stack gap={1}>
            <Heading level={2}>{t("title")}</Heading>
            <Text type="supporting">{t("intro")}</Text>
          </Stack>

          {result ? (
            <Banner
              status={result.skipped > 0 ? "warning" : "success"}
              title={t("resultTitle", {
                imported: result.imported,
                skipped: result.skipped,
              })}
              description={
                result.errors.length > 0 ? result.errors.join(" ") : undefined
              }
            />
          ) : null}

          {error ? (
            <Banner status="error" title={t("errorTitle")} description={error} />
          ) : null}

          <FormLayout>
            <FormTextArea
              control={control}
              name="csv"
              label={t("field")}
              description={t("fieldHint")}
            />
          </FormLayout>

          {errors.csv ? (
            <Text type="supporting" color="secondary">
              {t("required")}
            </Text>
          ) : null}

          <Button
            type="submit"
            variant="secondary"
            label={t("submit")}
            isLoading={isSubmitting}
          />
        </Stack>
      </form>
    </Card>
  );
}
