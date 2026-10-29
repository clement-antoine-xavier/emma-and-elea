import {createAlertService} from "@/server/services/alert.service";
import type {ScheduleRepository} from "@/server/repositories/schedule.repository";
import type {StockRepository} from "@/server/repositories/stock.repository";
import type {TaskRepository} from "@/server/repositories/task.repository";
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
  requiredSkillId: null,
  requiredSkillName: null,
  employeeId: null,
  employeeName: null,
  siteId: "site_1",
  siteName: "Atelier",
  position: 1,
};

const stocks = {
  listLevels: jest.fn().mockResolvedValue([
    {
      itemId: "item_1",
      itemCode: "FLOUR",
      itemName: "Flour",
      siteId: "site_1",
      siteName: "Atelier",
      unitId: "unit_kg",
      unitCode: "kg",
      quantity: "5",
      minStockQuantity: "10",
      parLevelQuantity: null,
      isBelowMin: true,
    },
  ]),
  expiringLots: jest.fn().mockResolvedValue([
    {
      id: "lot_1",
      lotNumber: "L-1",
      itemName: "Cream",
      siteName: "Atelier",
      expiresOn: new Date("2026-10-31T00:00:00.000Z"),
      quantityRemaining: "2",
      unitCode: "L",
    },
  ]),
} as unknown as StockRepository;

const schedules = {
  listAbsences: jest.fn().mockResolvedValue([
    {
      id: "absence_1",
      employeeId: "employee_1",
      employeeName: "Baker",
      kind: "VACATION",
      startsAt: new Date("2026-11-02T00:00:00.000Z"),
      endsAt: new Date("2026-11-05T00:00:00.000Z"),
      status: "REQUESTED",
      note: null,
      timeZone: "UTC",
    },
  ]),
} as unknown as ScheduleRepository;

const tasks = {
  list: jest.fn().mockResolvedValue([task]),
} as unknown as TaskRepository;

function service() {
  return createAlertService({
    stockRepository: stocks,
    scheduleRepository: schedules,
    taskRepository: tasks,
  });
}

describe("alert service", () => {
  it("collects the four alert kinds for a manager", async () => {
    const alerts = await service().getAlerts(actorFor("production_manager"));

    expect(alerts.map((alert) => alert.kind).sort()).toEqual([
      "EXPIRING_LOT",
      "LOW_STOCK",
      "PENDING_ABSENCE",
      "UNASSIGNED_TASK",
    ]);
  });

  it("hides absence alerts from roles that cannot decide", async () => {
    const alerts = await service().getAlerts(actorFor("staff"));

    expect(alerts.some((alert) => alert.kind === "PENDING_ABSENCE")).toBe(
      false,
    );
  });
});
