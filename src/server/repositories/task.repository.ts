import {prisma} from "@/lib/prisma";
import type {
  SkillLevelName,
  TaskEmployeeOption,
  TaskRecord,
  TaskStatusName,
} from "@/lib/dto";
import type {AvailabilityWindow} from "@/server/domain/schedule";

export type TaskFilters = {
  from: Date;
  to: Date;
  status: TaskStatusName | null;
  employeeId: string | null;
};

export type AssignmentTask = {
  id: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  requiredSkillId: string | null;
  assignedEmployeeId: string | null;
};

export type AssignmentEmployee = {
  id: string;
  name: string;
  jobTitle: string | null;
  skillIds: string[];
  skills: {skillId: string; level: SkillLevelName}[];
  availability: AvailabilityWindow[];
  absences: {startsAt: Date; endsAt: Date}[];
  tasks: {
    id: string;
    plannedStartAt: Date | null;
    plannedEndAt: Date | null;
  }[];
};

export type AssignmentContext = {
  task: AssignmentTask;
  timezone: string;
  employees: AssignmentEmployee[];
};

export interface TaskRepository {
  list(organizationId: string, filters: TaskFilters): Promise<TaskRecord[]>;
  employeeOptions(organizationId: string): Promise<TaskEmployeeOption[]>;
  employeeForMember(
    organizationId: string,
    membershipId: string,
  ): Promise<{id: string; name: string} | null>;
  myTasks(
    organizationId: string,
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<TaskRecord[]>;
  assignmentContext(
    organizationId: string,
    taskId: string,
  ): Promise<AssignmentContext | null>;
  assign(
    organizationId: string,
    taskId: string,
    employeeId: string | null,
  ): Promise<boolean>;
  setStatus(
    organizationId: string,
    taskId: string,
    status: TaskStatusName,
  ): Promise<boolean>;
  generateForBatch(organizationId: string, batchId: string): Promise<void>;
}

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  estimatedMinutes: true,
  plannedStartAt: true,
  plannedEndAt: true,
  position: true,
  requiredSkillId: true,
  requiredSkill: {select: {name: true}},
  assignedEmployee: {
    select: {id: true, member: {select: {user: {select: {name: true}}}}},
  },
  productionBatch: {
    select: {
      id: true,
      code: true,
      siteId: true,
      site: {select: {name: true}},
      recipeVersion: {select: {recipe: {select: {name: true}}}},
    },
  },
} as const;

type SelectedTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  estimatedMinutes: number | null;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  position: number;
  requiredSkillId: string | null;
  requiredSkill: {name: string} | null;
  assignedEmployee: {
    id: string;
    member: {user: {name: string}};
  } | null;
  productionBatch: {
    id: string;
    code: string;
    siteId: string;
    site: {name: string};
    recipeVersion: {recipe: {name: string}};
  } | null;
};

function toRecord(row: SelectedTask): TaskRecord {
  return {
    id: row.id,
    batchId: row.productionBatch?.id ?? null,
    batchCode: row.productionBatch?.code ?? null,
    recipeName: row.productionBatch?.recipeVersion.recipe.name ?? null,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatusName,
    estimatedMinutes: row.estimatedMinutes,
    plannedStartAt: row.plannedStartAt,
    plannedEndAt: row.plannedEndAt,
    requiredSkillId: row.requiredSkillId,
    requiredSkillName: row.requiredSkill?.name ?? null,
    employeeId: row.assignedEmployee?.id ?? null,
    employeeName: row.assignedEmployee?.member.user.name ?? null,
    siteId: row.productionBatch?.siteId ?? null,
    siteName: row.productionBatch?.site.name ?? null,
    position: row.position,
  };
}

export const taskRepository: TaskRepository = {
  async list(organizationId, filters) {
    const tasks = await prisma.productionTask.findMany({
      where: {
        organizationId,
        status: filters.status ?? undefined,
        assignedEmployeeId: filters.employeeId ?? undefined,
        OR: [
          {plannedStartAt: {gte: filters.from, lte: filters.to}},
          {plannedStartAt: null},
        ],
      },
      orderBy: [
        {plannedStartAt: "asc"},
        {position: "asc"},
        {title: "asc"},
      ],
      select: taskSelect,
    });

    return tasks.map(toRecord);
  },

  async employeeOptions(organizationId) {
    const employees = await prisma.employeeProfile.findMany({
      where: {organizationId, archivedAt: null, isActive: true},
      orderBy: {member: {user: {name: "asc"}}},
      select: {
        id: true,
        jobTitle: true,
        member: {select: {user: {select: {name: true}}}},
        skills: {select: {skillId: true}},
      },
    });

    return employees.map((employee) => ({
      id: employee.id,
      name: employee.member.user.name,
      jobTitle: employee.jobTitle,
      skillIds: employee.skills.map((skill) => skill.skillId),
    }));
  },

  async employeeForMember(organizationId, membershipId) {
    const employee = await prisma.employeeProfile.findFirst({
      where: {organizationId, memberId: membershipId, archivedAt: null},
      select: {id: true, member: {select: {user: {select: {name: true}}}}},
    });

    return employee
      ? {id: employee.id, name: employee.member.user.name}
      : null;
  },

  async myTasks(organizationId, employeeId, from, to) {
    const tasks = await prisma.productionTask.findMany({
      where: {
        organizationId,
        assignedEmployeeId: employeeId,
        OR: [
          {plannedStartAt: {gte: from, lte: to}},
          {plannedStartAt: null},
        ],
      },
      orderBy: [{plannedStartAt: "asc"}, {position: "asc"}],
      select: taskSelect,
    });

    return tasks.map(toRecord);
  },

  async assignmentContext(organizationId, taskId) {
    const task = await prisma.productionTask.findFirst({
      where: {id: taskId, organizationId},
      select: {
        id: true,
        plannedStartAt: true,
        plannedEndAt: true,
        requiredSkillId: true,
        assignedEmployeeId: true,
        productionBatch: {select: {site: {select: {timezone: true}}}},
      },
    });
    if (!task) return null;

    const employees = await prisma.employeeProfile.findMany({
      where: {organizationId, archivedAt: null, isActive: true},
      orderBy: {member: {user: {name: "asc"}}},
      select: {
        id: true,
        jobTitle: true,
        member: {select: {user: {select: {name: true}}}},
        skills: {select: {skillId: true, level: true}},
        availability: {
          select: {
            weekday: true,
            startMinute: true,
            endMinute: true,
            validFrom: true,
            validTo: true,
          },
        },
        absences: {
          where: {status: "APPROVED"},
          select: {startsAt: true, endsAt: true},
        },
        tasksAssigned: {
          where: {status: {in: ["TODO", "IN_PROGRESS", "BLOCKED"]}},
          select: {id: true, plannedStartAt: true, plannedEndAt: true},
        },
      },
    });

    return {
      task: {
        id: task.id,
        plannedStartAt: task.plannedStartAt,
        plannedEndAt: task.plannedEndAt,
        requiredSkillId: task.requiredSkillId,
        assignedEmployeeId: task.assignedEmployeeId,
      },
      timezone: task.productionBatch?.site.timezone ?? "UTC",
      employees: employees.map((employee) => ({
        id: employee.id,
        name: employee.member.user.name,
        jobTitle: employee.jobTitle,
        skillIds: employee.skills.map((skill) => skill.skillId),
        skills: employee.skills.map((skill) => ({
          skillId: skill.skillId,
          level: skill.level as SkillLevelName,
        })),
        availability: employee.availability,
        absences: employee.absences,
        tasks: employee.tasksAssigned,
      })),
    };
  },

  async assign(organizationId, taskId, employeeId) {
    const result = await prisma.productionTask.updateMany({
      where: {id: taskId, organizationId},
      data: {assignedEmployeeId: employeeId},
    });

    return result.count > 0;
  },

  async setStatus(organizationId, taskId, status) {
    const result = await prisma.productionTask.updateMany({
      where: {id: taskId, organizationId},
      data: {status},
    });

    return result.count > 0;
  },

  async generateForBatch(organizationId, batchId) {
    const batch = await prisma.productionBatch.findFirst({
      where: {id: batchId, organizationId},
      select: {
        plannedStartAt: true,
        recipeVersion: {
          select: {
            operations: {
              orderBy: {position: "asc"},
              select: {
                name: true,
                description: true,
                durationMinutes: true,
                activeMinutes: true,
                position: true,
                requiredSkillId: true,
              },
            },
          },
        },
      },
    });
    if (!batch || batch.recipeVersion.operations.length === 0) return;

    let cursor = batch.plannedStartAt;

    const data = batch.recipeVersion.operations.map((operation) => {
      const minutes = operation.activeMinutes ?? operation.durationMinutes;
      const start = cursor;
      const end = start
        ? new Date(start.getTime() + minutes * 60 * 1000)
        : null;
      if (end) cursor = end;

      return {
        organizationId,
        productionBatchId: batchId,
        title: operation.name,
        description: operation.description,
        status: "TODO" as const,
        estimatedMinutes: minutes,
        plannedStartAt: start,
        plannedEndAt: end,
        position: operation.position,
        requiredSkillId: operation.requiredSkillId,
      };
    });

    await prisma.productionTask.createMany({data, skipDuplicates: true});
  },
};
