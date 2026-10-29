import {createTaskService} from "@/server/services/task.service";
import type {
  AssignmentContext,
  TaskRepository,
} from "@/server/repositories/task.repository";
import type {TaskRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";

const task: TaskRecord = {
  id: "task_1",
  batchId: "batch_1",
  batchCode: "B-1",
  recipeName: "Croissant",
  title: "Bake",
  description: null,
  status: "TODO",
  estimatedMinutes: 30,
  plannedStartAt: new Date("2026-10-29T08:00:00.000Z"),
  plannedEndAt: new Date("2026-10-29T08:30:00.000Z"),
  requiredSkillId: "skill_bake",
  requiredSkillName: "Baking",
  employeeId: null,
  employeeName: null,
  siteId: "site_1",
  siteName: "Atelier",
  position: 1,
};

function context(): AssignmentContext {
  return {
    task: {
      id: "task_1",
      plannedStartAt: new Date("2026-10-29T08:00:00.000Z"),
      plannedEndAt: new Date("2026-10-29T08:30:00.000Z"),
      requiredSkillId: "skill_bake",
      assignedEmployeeId: null,
    },
    timezone: "UTC",
    employees: [
      {
        id: "employee_1",
        name: "Baker",
        jobTitle: "Baker",
        skillIds: ["skill_bake"],
        skills: [{skillId: "skill_bake", level: "EXPERT"}],
        availability: [],
        absences: [],
        tasks: [],
      },
      {
        id: "employee_2",
        name: "Apprentice",
        jobTitle: null,
        skillIds: [],
        skills: [],
        availability: [],
        absences: [],
        tasks: [],
      },
    ],
  };
}

function repository(
  overrides: Partial<TaskRepository> = {},
): TaskRepository {
  return {
    list: jest.fn().mockResolvedValue([task]),
    employeeOptions: jest.fn().mockResolvedValue([]),
    employeeForMember: jest
      .fn()
      .mockResolvedValue({id: "employee_1", name: "Baker"}),
    myTasks: jest.fn().mockResolvedValue([task]),
    assignmentContext: jest.fn().mockResolvedValue(context()),
    assign: jest.fn().mockResolvedValue(true),
    setStatus: jest.fn().mockResolvedValue(true),
    generateForBatch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("task service", () => {
  it("requires task:read", async () => {
    const service = createTaskService({taskRepository: repository()});

    await expect(service.getTasks(actorFor("sales"), undefined)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      service.getTasks(actorFor("staff"), undefined),
    ).resolves.toMatchObject({tasks: [task]});
  });

  it("assigns an employee with the required skill", async () => {
    const repo = repository();
    const service = createTaskService({taskRepository: repo});

    await expect(
      service.assignTask(actorFor("production_manager"), "task_1", "employee_1"),
    ).resolves.toBeUndefined();
    expect(repo.assign).toHaveBeenCalledWith("org_1", "task_1", "employee_1");
  });

  it("rejects an employee without the required skill", async () => {
    const repo = repository();
    const service = createTaskService({taskRepository: repo});

    await expect(
      service.assignTask(actorFor("production_manager"), "task_1", "employee_2"),
    ).rejects.toMatchObject({code: "EMPLOYEE_UNAVAILABLE"});
    expect(repo.assign).not.toHaveBeenCalled();
  });

  it("rejects an overlapping task", async () => {
    const overlapping = context();
    overlapping.employees[0].tasks = [
      {
        id: "task_2",
        plannedStartAt: new Date("2026-10-29T08:15:00.000Z"),
        plannedEndAt: new Date("2026-10-29T08:45:00.000Z"),
      },
    ];
    const service = createTaskService({
      taskRepository: repository({
        assignmentContext: jest.fn().mockResolvedValue(overlapping),
      }),
    });

    await expect(
      service.assignTask(actorFor("production_manager"), "task_1", "employee_1"),
    ).rejects.toMatchObject({code: "SHIFT_CONFLICT"});
  });

  it("lets staff update only their own task", async () => {
    const own = context();
    own.task.assignedEmployeeId = "employee_1";
    const service = createTaskService({
      taskRepository: repository({
        assignmentContext: jest.fn().mockResolvedValue(own),
      }),
    });

    await expect(
      service.setTaskStatus(actorFor("staff"), "task_1", "DONE"),
    ).resolves.toBeUndefined();

    const other = context();
    other.task.assignedEmployeeId = "employee_2";
    const restricted = createTaskService({
      taskRepository: repository({
        assignmentContext: jest.fn().mockResolvedValue(other),
      }),
    });

    await expect(
      restricted.setTaskStatus(actorFor("staff"), "task_1", "DONE"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("suggests the most skilled available employee", async () => {
    const service = createTaskService({taskRepository: repository()});

    await expect(
      service.suggestEmployee(actorFor("production_manager"), "task_1"),
    ).resolves.toBe("employee_1");
  });
});
