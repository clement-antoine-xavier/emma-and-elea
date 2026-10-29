"use client";

import {Badge} from "@astryxdesign/core/Badge";
import {Table, proportional} from "@astryxdesign/core/Table";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import type {WorkloadRowRecord} from "@/lib/dto";

function hours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

export function WorkloadTable({rows}: {rows: WorkloadRowRecord[]}) {
  const t = useTranslations("Team.workload");

  return (
    <Stack gap={3}>
      <Stack gap={1}>
        <Heading level={2}>{t("title")}</Heading>
        <Text type="supporting">{t("intro")}</Text>
      </Stack>

      <Table<WorkloadRowRecord>
        data={rows}
        idKey="employeeId"
        density="compact"
        columns={[
          {
            key: "employee",
            header: t("columns.employee"),
            width: proportional(3),
            renderCell: (row) => row.employeeName,
          },
          {
            key: "contract",
            header: t("columns.contract"),
            width: proportional(2),
            align: "end",
            renderCell: (row) =>
              row.contractHours ? `${row.contractHours} h` : "—",
          },
          {
            key: "shifts",
            header: t("columns.shifts"),
            width: proportional(2),
            align: "end",
            renderCell: (row) => `${hours(row.shiftMinutes)} h`,
          },
          {
            key: "tasks",
            header: t("columns.tasks"),
            width: proportional(2),
            align: "end",
            renderCell: (row) => `${hours(row.taskMinutes)} h`,
          },
          {
            key: "conflicts",
            header: t("columns.conflicts"),
            width: proportional(2),
            align: "end",
            renderCell: (row) =>
              row.conflictCount > 0 ? (
                <Badge variant="error" label={String(row.conflictCount)} />
              ) : (
                "—"
              ),
          },
          {
            key: "status",
            header: t("columns.status"),
            width: proportional(2),
            renderCell: (row) =>
              row.isOverloaded ? (
                <Badge variant="warning" label={t("overloaded")} />
              ) : (
                <Badge variant="success" label={t("ok")} />
              ),
          },
        ]}
      />
    </Stack>
  );
}
