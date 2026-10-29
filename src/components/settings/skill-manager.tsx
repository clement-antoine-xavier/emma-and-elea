"use client";

import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Badge} from "@astryxdesign/core/Badge";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {Dialog, DialogHeader} from "@astryxdesign/core/Dialog";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {FormLayout} from "@astryxdesign/core/FormLayout";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Heading} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  archiveSkillAction,
  createSkillAction,
} from "@/app/actions/skill.actions";
import {FormTextArea} from "@/components/form-text-area";
import {FormTextInput} from "@/components/form-text-input";
import type {SkillRecord} from "@/lib/dto";
import {
  createSkillSchema,
  type CreateSkillValues,
} from "@/server/validators/skill.schema";

export function SkillManager({
  skills,
  canWrite,
}: {
  skills: SkillRecord[];
  canWrite: boolean;
}) {
  const t = useTranslations("Skills");
  const tValidation = useTranslations("Skills.validation");
  const tErrors = useTranslations("Settings.errors");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const schema = useMemo(
    () => createSkillSchema((key) => tValidation(key)),
    [tValidation],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: {errors, isSubmitting},
  } = useForm<CreateSkillValues>({
    resolver: zodResolver(schema),
    defaultValues: {code: "", name: "", description: ""},
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: false,
  });

  async function onSubmit(values: CreateSkillValues) {
    setError(null);
    const result = await createSkillAction(values);

    if (!result.ok) {
      setFormError("root", {type: "server", message: tErrors(result.error)});
      return;
    }

    reset();
    setCreateOpen(false);
    router.refresh();
  }

  async function archive(skill: SkillRecord) {
    setError(null);
    setPendingId(skill.id);

    try {
      const result = await archiveSkillAction({id: skill.id});
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
      {canWrite ? (
        <Dialog
          isOpen={createOpen}
          onOpenChange={setCreateOpen}
          width={520}
          purpose="form"
        >
          <DialogHeader
            title={t("createTitle")}
            subtitle={t("createIntro")}
            onOpenChange={setCreateOpen}
          />
          <Card padding={0}>
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
                  <FormTextInput
                    control={control}
                    name="code"
                    label={t("fields.code")}
                    isRequired
                  />
                  <FormTextInput
                    control={control}
                    name="name"
                    label={t("fields.name")}
                    isRequired
                  />
                  <FormTextArea
                    control={control}
                    name="description"
                    label={t("fields.description")}
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
        </Dialog>
      ) : null}

      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <Heading level={2}>{t("listTitle")}</Heading>
        {canWrite ? (
          <Button
            variant="primary"
            label={t("createTitle")}
            onClick={() => setCreateOpen(true)}
          />
        ) : null}
      </HStack>

      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      {skills.length === 0 ? (
        <Card padding={4}>
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyBody")}
            isCompact
          />
        </Card>
      ) : (
        <Table<SkillRecord>
          data={skills}
          idKey="id"
          density="compact"
          columns={[
            {
              key: "name",
              header: t("columns.name"),
              width: proportional(3),
              renderCell: (skill) => skill.name,
            },
            {
              key: "code",
              header: t("columns.code"),
              width: proportional(1),
              renderCell: (skill) => skill.code,
            },
            {
              key: "description",
              header: t("columns.description"),
              width: proportional(4),
              renderCell: (skill) => skill.description ?? "—",
            },
            {
              key: "status",
              header: t("columns.status"),
              width: proportional(1),
              renderCell: (skill) => (
                <Badge
                  label={skill.archivedAt ? t("archived") : t("active")}
                  variant={skill.archivedAt ? "neutral" : "success"}
                />
              ),
            },
            {
              key: "actions",
              header: "",
              width: pixel(110),
              renderCell: (skill) =>
                canWrite && !skill.archivedAt ? (
                  <Button
                    label={t("archive")}
                    variant="ghost"
                    size="sm"
                    isLoading={pendingId === skill.id}
                    onClick={() => archive(skill)}
                  />
                ) : null,
            },
          ]}
        />
      )}
    </Stack>
  );
}
