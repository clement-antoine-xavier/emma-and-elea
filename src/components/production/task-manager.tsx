"use client";

import {useState} from "react";
import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {Card} from "@astryxdesign/core/Card";
import {EmptyState} from "@astryxdesign/core/EmptyState";
import {Selector} from "@astryxdesign/core/Selector";
import {Table, pixel, proportional} from "@astryxdesign/core/Table";
import {Text} from "@astryxdesign/core/Text";
import {useLocale, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {
  assignTaskAction,
  setTaskStatusAction,
  suggestTaskAction,
} from "@/app/actions/task.actions";
import {formatBusinessDate} from "@/lib/format";
import type {
  TaskEmployeeOption,
  TaskRecord,
  TaskStatusName,
} from "@/lib/dto";

const STATUSES: readonly TaskStatusName[] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
];

function timeOf(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TaskManager({
  tasks,
  employees,
  canWrite,
  canExecute,
}: {
  tasks: TaskRecord[];
  employees: TaskEmployeeOption[];
  canWrite: boolean;
  canExecute: boolean;
}) {
  const t = useTranslations("Tasks");
  const tErrors = useTranslations("Common.errors");
  const locale = useLocale();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function assign(task: TaskRecord, employeeId: string) {
    setPendingId(task.id);
    setError(null);
    try {
      const result = await assignTaskAction(
        task.id,
        employeeId === "" ? null : employeeId,
      );
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function suggest(task: TaskRecord) {
    setPendingId(task.id);
    setError(null);
    try {
      const suggestion = await suggestTaskAction(task.id);
      if (!suggestion.ok || !suggestion.employeeId) {
        setError(tErrors(suggestion.ok ? "invalidState" : suggestion.error));
        return;
      }
      const result = await assignTaskAction(task.id, suggestion.employeeId);
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function setStatus(task: TaskRecord, status: string) {
    setPendingId(task.id);
    setError(null);
    try {
      const result = await setTaskStatusAction(
        task.id,
        status as TaskStatusName,
      );
      if (!result.ok) {
        setError(tErrors(result.error));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  const employeeOptions = [
    {value: "", label: t("unassigned")},
    ...employees.map((employee) => ({
      value: employee.id,
      label: employee.jobTitle
        ? `${employee.name} · ${employee.jobTitle}`
        : employee.name,
    })),
  ];

  if (tasks.length === 0) {
    return (
      <Card padding={4}>
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyBody")}
          isCompact
        />
      </Card>
    );
  }

  return (
    <>
      {error ? (
        <Banner status="error" title={t("errorTitle")} description={error} />
      ) : null}

      <Table<TaskRecord>
        data={tasks}
        idKey="id"
        density="compact"
        columns={[
          {
            key: "task",
            header: t("columns.task"),
            width: proportional(4),
            renderCell: (task) => (
              <Text weight="semibold">
                {task.recipeName ? `${task.recipeName} · ${task.title}` : task.title}
              </Text>
            ),
          },
          {
            key: "batch",
            header: t("columns.batch"),
            width: proportional(2),
            renderCell: (task) => task.batchCode ?? "—",
          },
          {
            key: "when",
            header: t("columns.when"),
            width: pixel(170),
            renderCell: (task) =>
              task.plannedStartAt
                ? `${formatBusinessDate(task.plannedStartAt, {locale})} ${timeOf(
                    task.plannedStartAt,
                    locale,
                  )}`
                : t("unscheduled"),
          },
          {
            key: "skill",
            header: t("columns.skill"),
            width: proportional(2),
            renderCell: (task) => task.requiredSkillName ?? "—",
          },
          {
            key: "employee",
            header: t("columns.employee"),
            width: proportional(2),
            renderCell: (task) =>
              canWrite ? (
                <Selector
                  label={t("columns.employee")}
                  options={employeeOptions}
                  value={task.employeeId ?? ""}
                  onChange={(value) => assign(task, value)}
                  isDisabled={pendingId === task.id}
                />
              ) : (
                task.employeeName ?? t("unassigned")
              ),
          },
          {
            key: "status",
            header: t("columns.status"),
            width: pixel(140),
            renderCell: (task) =>
              canWrite || canExecute ? (
                <Selector
                  label={t("columns.status")}
                  options={STATUSES.map((status) => ({
                    value: status,
                    label: t(`statuses.${status}`),
                  }))}
                  value={task.status}
                  onChange={(value) => setStatus(task, value)}
                  isDisabled={pendingId === task.id}
                />
              ) : (
                t(`statuses.${task.status}`)
              ),
          },
          {
            key: "actions",
            header: "",
            width: pixel(120),
            renderCell: (task) =>
              canWrite ? (
                <Button
                  label={t("suggest")}
                  variant="secondary"
                  size="sm"
                  isLoading={pendingId === task.id}
                  onClick={() => suggest(task)}
                />
              ) : null,
          },
        ]}
      />
    </>
  );
}
