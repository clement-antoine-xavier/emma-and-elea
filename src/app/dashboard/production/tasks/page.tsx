import type {Metadata} from "next";
import {Button} from "@astryxdesign/core/Button";
import {HStack} from "@astryxdesign/core/HStack";
import {getTranslations} from "next-intl/server";
import {PageShell} from "@/components/layout/page-shell";
import {TaskDateFilter} from "@/components/production/task-date-filter";
import {TaskManager} from "@/components/production/task-manager";
import {requirePermission} from "@/server/auth/actor";
import {taskService} from "@/server/services/container";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Tasks");

  return {title: t("metadataTitle")};
}

function isoDay(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().slice(0, 10);
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission("task:read");
  const t = await getTranslations("Tasks");
  const params = await searchParams;
  const date = isoDay(params.date);
  const view = await taskService.getTasks(actor, date);

  return (
    <PageShell
      title={t("title")}
      intro={t("intro")}
      actions={
        <HStack gap={2} wrap="wrap">
          <TaskDateFilter date={date} />
          <Button
            label={t("myWork")}
            variant="secondary"
            href="/dashboard/my-work"
          />
        </HStack>
      }
      contentWidth={1400}
    >
      <TaskManager
        tasks={view.tasks}
        employees={view.employees}
        canWrite={view.canWrite}
        canExecute={view.canExecute}
      />
    </PageShell>
  );
}
