import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import {
  absenceOverlaps,
  availabilityCovers,
  shiftsOverlap,
  zonedParts,
} from "@/server/domain/schedule";
import type {
  TaskEmployeeOption,
  TaskRecord,
  TaskStatusName,
} from "@/lib/dto";
import type {
  AssignmentContext,
  AssignmentEmployee,
  TaskFilters,
  TaskRepository,
} from "@/server/repositories/task.repository";

export type TaskView = {
  tasks: TaskRecord[];
  employees: TaskEmployeeOption[];
  canWrite: boolean;
  canExecute: boolean;
};

export type MyWorkView = {
  employee: {id: string; name: string} | null;
  tasks: TaskRecord[];
  canExecute: boolean;
};

export interface TaskService {
  getTasks(actor: Actor | null, date: string | undefined): Promise<TaskView>;
  getMyWork(actor: Actor | null, date: string | undefined): Promise<MyWorkView>;
  assignTask(
    actor: Actor | null,
    taskId: string,
    employeeId: string | null,
  ): Promise<void>;
  setTaskStatus(
    actor: Actor | null,
    taskId: string,
    status: TaskStatusName,
  ): Promise<void>;
  suggestEmployee(
    actor: Actor | null,
    taskId: string,
  ): Promise<string | null>;
}

const LEVEL_RANK: Record<string, number> = {
  EXPERT: 4,
  ADVANCED: 3,
  INTERMEDIATE: 2,
  BEGINNER: 1,
};

const STATUSES: readonly TaskStatusName[] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
];

function parseDay(value: string | undefined): Date {
  const raw = value?.trim();
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }

  return new Date(`${raw}T00:00:00.000Z`);
}

function isStatus(value: string): value is TaskStatusName {
  return (STATUSES as readonly string[]).includes(value);
}

/**
 * Whether the employee can take this task. Returns null when eligible, or the
 * domain error code to throw.
 */
function eligibility(
  context: AssignmentContext,
  employee: AssignmentEmployee,
): "EMPLOYEE_UNAVAILABLE" | "SHIFT_CONFLICT" | null {
  if (
    context.task.requiredSkillId &&
    !employee.skills.some(
      (skill) => skill.skillId === context.task.requiredSkillId,
    )
  ) {
    return "EMPLOYEE_UNAVAILABLE";
  }

  if (!context.task.plannedStartAt || !context.task.plannedEndAt) return null;

  const start = zonedParts(context.task.plannedStartAt, context.timezone);
  const end = zonedParts(context.task.plannedEndAt, context.timezone);
  if (start.dateKey !== end.dateKey) return "EMPLOYEE_UNAVAILABLE";

  if (
    !availabilityCovers(employee.availability, {
      weekday: start.weekday,
      startMinute: start.minutes,
      endMinute: end.minutes,
      dateKey: start.dateKey,
    })
  ) {
    return "EMPLOYEE_UNAVAILABLE";
  }

  if (
    employee.absences.some((absence) =>
      absenceOverlaps(absence, {
        startsAt: context.task.plannedStartAt as Date,
        endsAt: context.task.plannedEndAt as Date,
      }),
    )
  ) {
    return "EMPLOYEE_UNAVAILABLE";
  }

  if (
    employee.tasks.some(
      (task) =>
        task.id !== context.task.id &&
        task.plannedStartAt &&
        task.plannedEndAt &&
        shiftsOverlap(
          {startsAt: task.plannedStartAt, endsAt: task.plannedEndAt},
          {
            startsAt: context.task.plannedStartAt as Date,
            endsAt: context.task.plannedEndAt as Date,
          },
        ),
    )
  ) {
    return "SHIFT_CONFLICT";
  }

  return null;
}

export function createTaskService(deps: {
  taskRepository: TaskRepository;
}): TaskService {
  async function requireContext(
    organizationId: string,
    taskId: string,
  ): Promise<AssignmentContext> {
    const context = await deps.taskRepository.assignmentContext(
      organizationId,
      taskId,
    );
    if (!context) throw new DomainError("NOT_FOUND");
    return context;
  }

  function filters(date: string | undefined): TaskFilters {
    const from = parseDay(date);
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 7);

    return {from, to, status: null, employeeId: null};
  }

  return {
    async getTasks(actorInput, date) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "task:read");

      const [tasks, employees] = await Promise.all([
        deps.taskRepository.list(actor.organizationId, filters(date)),
        deps.taskRepository.employeeOptions(actor.organizationId),
      ]);

      return {
        tasks,
        employees,
        canWrite: isGranted(actor, "task:write"),
        canExecute: isGranted(actor, "task:execute"),
      };
    },

    async getMyWork(actorInput, date) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "task:read");

      const employee = await deps.taskRepository.employeeForMember(
        actor.organizationId,
        actor.membershipId,
      );
      if (!employee) {
        return {
          employee: null,
          tasks: [],
          canExecute: isGranted(actor, "task:execute"),
        };
      }

      const from = parseDay(date);
      const to = new Date(from);
      to.setUTCDate(to.getUTCDate() + 7);

      return {
        employee,
        tasks: await deps.taskRepository.myTasks(
          actor.organizationId,
          employee.id,
          from,
          to,
        ),
        canExecute: isGranted(actor, "task:execute"),
      };
    },

    async assignTask(actorInput, taskId, employeeId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "task:write");

      const context = await requireContext(actor.organizationId, taskId);

      if (employeeId) {
        const employee = context.employees.find(
          (candidate) => candidate.id === employeeId,
        );
        if (!employee) throw new DomainError("NOT_FOUND");

        const problem = eligibility(context, employee);
        if (problem) {
          throw new DomainError(
            problem,
            problem === "SHIFT_CONFLICT"
              ? "This employee already has a task at that time."
              : "This employee is not available for this task.",
          );
        }
      }

      const updated = await deps.taskRepository.assign(
        actor.organizationId,
        taskId,
        employeeId,
      );
      if (!updated) throw new DomainError("NOT_FOUND");
    },

    async setTaskStatus(actorInput, taskId, status) {
      const actor = assertOrganizationActor(actorInput);
      if (!isStatus(status)) throw new DomainError("INVALID_INPUT");

      const canWrite = isGranted(actor, "task:write");
      const canExecute = isGranted(actor, "task:execute");
      if (!canWrite && !canExecute) {
        throw new DomainError("FORBIDDEN");
      }

      if (!canWrite) {
        const employee = await deps.taskRepository.employeeForMember(
          actor.organizationId,
          actor.membershipId,
        );
        const context = await requireContext(actor.organizationId, taskId);
        if (!employee || context.task.assignedEmployeeId !== employee.id) {
          throw new DomainError("FORBIDDEN");
        }
      }

      const updated = await deps.taskRepository.setStatus(
        actor.organizationId,
        taskId,
        status,
      );
      if (!updated) throw new DomainError("NOT_FOUND");
    },

    async suggestEmployee(actorInput, taskId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "task:write");

      const context = await requireContext(actor.organizationId, taskId);
      const candidates = context.employees
        .filter((employee) => eligibility(context, employee) === null)
        .sort((a, b) => {
          if (
            context.task.requiredSkillId &&
            context.task.requiredSkillId
          ) {
            const left = Math.max(
              0,
              ...a.skills
                .filter(
                  (skill) => skill.skillId === context.task.requiredSkillId,
                )
                .map((skill) => LEVEL_RANK[skill.level] ?? 0),
            );
            const right = Math.max(
              0,
              ...b.skills
                .filter(
                  (skill) => skill.skillId === context.task.requiredSkillId,
                )
                .map((skill) => LEVEL_RANK[skill.level] ?? 0),
            );
            if (left !== right) return right - left;
          }

          if (a.tasks.length !== b.tasks.length) {
            return a.tasks.length - b.tasks.length;
          }
          return a.name.localeCompare(b.name);
        });

      return candidates[0]?.id ?? null;
    },
  };
}
