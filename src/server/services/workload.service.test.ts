import {createWorkloadService} from "@/server/services/workload.service";
import type {ScheduleRepository} from "@/server/repositories/schedule.repository";
import type {TaskRepository} from "@/server/repositories/task.repository";
import type {TaskRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";

const employee = {
  id: "employee_1",
  memberId: "member_1",
  name: "Baker",
  email: "baker@example.com",
  role: "staff" as const,
  siteId: "site_1",
  siteName: "Atelier",
  jobTitle: "Baker",
  weeklyContractHours: "35",
  hiredOn: null,
  color: null,
  isActive: true,
  archivedAt: null,
};

const task: TaskRecord = {
  id: "task_1",
  batchId: "batch_1",
  batchCode: "B-1",
  recipeName: "Croissant",
  title: "Bake",
  description: null,
  status: "TODO",
  estimatedMinutes: 60,
  plannedStartAt: new Date("2026-10-26T08:00:00.000Z"),
  plannedEndAt: new Date("2026-10-26T09:00:00.000Z"),
  requiredSkillId: null,
  requiredSkillName: null,
  employeeId: "employee_1",
  employeeName: "Baker",
  siteId: "site_1",
  siteName: "Atelier",
  position: 1,
};

const scheduleRepository = {
  listShifts: jest.fn().mockResolvedValue([
    {
      id: "shift_1",
      siteId: "site_1",
      siteName: "Atelier",
      timeZone: "UTC",
      startsAt: new Date("2026-10-26T06:00:00.000Z"),
      endsAt: new Date("2026-10-26T14:00:00.000Z"),
      kind: "PRODUCTION",
      note: null,
      assignments: [
        {
          id: "assignment_1",
          employeeId: "employee_1",
          employeeName: "Baker",
          role: null,
          status: "PLANNED",
        },
      ],
    },
  ]),
  listAbsences: jest.fn().mockResolvedValue([
    {
      id: "absence_1",
      employeeId: "employee_1",
      employeeName: "Baker",
      kind: "SICK",
      startsAt: new Date("2026-10-26T07:00:00.000Z"),
      endsAt: new Date("2026-10-26T10:00:00.000Z"),
      status: "APPROVED",
      note: null,
      timeZone: "UTC",
    },
  ]),
  listProfiles: jest.fn().mockResolvedValue([employee]),
} as unknown as ScheduleRepository;

const taskRepository = {
  list: jest.fn().mockResolvedValue([task]),
} as unknown as TaskRepository;

describe("workload service", () => {
  it("counts shifts, tasks, conflicts and overload", async () => {
    const service = createWorkloadService({
      scheduleRepository,
      taskRepository,
    });

    const view = await service.getWeek(actorFor("production_manager"), {
      week: "2026-10-26",
    });

    expect(view.weekStart.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(view.rows).toEqual([
      {
        employeeId: "employee_1",
        employeeName: "Baker",
        jobTitle: "Baker",
        contractHours: "35",
        shiftMinutes: 480,
        taskMinutes: 60,
        conflictCount: 2,
        isOverloaded: false,
      },
    ]);
  });

  it("requires team:read", async () => {
    const service = createWorkloadService({
      scheduleRepository,
      taskRepository,
    });

    await expect(
      service.getWeek(actorFor("staff"), {}),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});
