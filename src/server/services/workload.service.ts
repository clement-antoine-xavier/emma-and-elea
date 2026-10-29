import {
  assertOrganizationActor,
  assertPermission,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {
  absenceOverlaps,
  addDays,
  shiftsOverlap,
  startOfWeek,
} from "@/server/domain/schedule";
import type {WorkloadRowRecord} from "@/lib/dto";
import type {ScheduleRepository} from "@/server/repositories/schedule.repository";
import type {TaskRepository} from "@/server/repositories/task.repository";

export type WorkloadView = {
  weekStart: Date;
  weekEnd: Date;
  rows: WorkloadRowRecord[];
};

export interface WorkloadService {
  getWeek(
    actor: Actor | null,
    filters: {week?: string | string[]},
  ): Promise<WorkloadView>;
}

function parseWeek(value: string | string[] | undefined): Date {
  const raw = Array.isArray(value) ? value[0] : value;
  const fallback = new Date();
  fallback.setUTCHours(0, 0, 0, 0);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return startOfWeek(fallback);
  }

  return startOfWeek(new Date(`${raw}T00:00:00.000Z`));
}

function minutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function createWorkloadService(deps: {
  scheduleRepository: ScheduleRepository;
  taskRepository: TaskRepository;
}): WorkloadService {
  return {
    async getWeek(actorInput, filters) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:read");

      const weekStart = parseWeek(filters.week);
      const weekEnd = addDays(weekStart, 7);

      const [shifts, absences, tasks, profiles] = await Promise.all([
        deps.scheduleRepository.listShifts(actor.organizationId, {
          from: weekStart,
          to: weekEnd,
          siteId: null,
        }),
        deps.scheduleRepository.listAbsences(actor.organizationId, {
          from: weekStart,
          to: weekEnd,
        }),
        deps.taskRepository.list(actor.organizationId, {
          from: weekStart,
          to: weekEnd,
          status: null,
          employeeId: null,
        }),
        deps.scheduleRepository.listProfiles(actor.organizationId),
      ]);

      const approved = absences.filter(
        (absence) => absence.status === "APPROVED",
      );
      const scheduledTasks = tasks.filter(
        (task) =>
          task.plannedStartAt !== null &&
          task.status !== "DONE" &&
          task.employeeId !== null,
      );

      const rows = profiles
        .filter((employee) => employee.isActive)
        .map((employee) => {
          const employeeShifts = shifts.filter((shift) =>
            shift.assignments.some(
              (assignment) =>
                assignment.employeeId === employee.id &&
                assignment.status !== "ABSENT",
            ),
          );
          const employeeTasks = scheduledTasks.filter(
            (task) => task.employeeId === employee.id,
          );

          const shiftMinutes = employeeShifts.reduce(
            (total, shift) =>
              total + minutes(shift.startsAt, shift.endsAt),
            0,
          );
          const taskMinutes = employeeTasks.reduce(
            (total, task) => total + (task.estimatedMinutes ?? 0),
            0,
          );

          const shiftConflicts = employeeShifts.filter((shift) =>
            approved.some(
              (absence) =>
                absence.employeeId === employee.id &&
                absenceOverlaps(absence, shift),
            ),
          ).length;

          const taskAbsenceConflicts = employeeTasks.filter(
            (task) =>
              task.plannedStartAt &&
              task.plannedEndAt &&
              approved.some(
                (absence) =>
                  absence.employeeId === employee.id &&
                  absenceOverlaps(absence, {
                    startsAt: task.plannedStartAt as Date,
                    endsAt: task.plannedEndAt as Date,
                  }),
              ),
          ).length;

          let taskOverlaps = 0;
          for (let index = 0; index < employeeTasks.length; index += 1) {
            for (
              let other = index + 1;
              other < employeeTasks.length;
              other += 1
            ) {
              const first = employeeTasks[index];
              const second = employeeTasks[other];
              if (
                first.plannedStartAt &&
                first.plannedEndAt &&
                second.plannedStartAt &&
                second.plannedEndAt &&
                shiftsOverlap(
                  {
                    startsAt: first.plannedStartAt,
                    endsAt: first.plannedEndAt,
                  },
                  {
                    startsAt: second.plannedStartAt,
                    endsAt: second.plannedEndAt,
                  },
                )
              ) {
                taskOverlaps += 1;
              }
            }
          }

          const contractHours = employee.weeklyContractHours
            ? Number(employee.weeklyContractHours)
            : null;

          return {
            employeeId: employee.id,
            employeeName: employee.name,
            jobTitle: employee.jobTitle,
            contractHours: employee.weeklyContractHours,
            shiftMinutes,
            taskMinutes,
            conflictCount:
              shiftConflicts + taskAbsenceConflicts + taskOverlaps,
            isOverloaded:
              contractHours !== null && shiftMinutes > contractHours * 60,
          };
        })
        .sort((a, b) => a.employeeName.localeCompare(b.employeeName));

      return {weekStart, weekEnd, rows};
    },
  };
}
