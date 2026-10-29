import {
  assertOrganizationActor,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import type {AlertRecord} from "@/lib/dto";
import type {ScheduleRepository} from "@/server/repositories/schedule.repository";
import type {StockRepository} from "@/server/repositories/stock.repository";
import type {TaskRepository} from "@/server/repositories/task.repository";

export interface AlertService {
  getAlerts(actor: Actor | null): Promise<AlertRecord[]>;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function day(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function createAlertService(deps: {
  stockRepository: StockRepository;
  scheduleRepository: ScheduleRepository;
  taskRepository: TaskRepository;
}): AlertService {
  return {
    async getAlerts(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      const now = new Date();
      const inSevenDays = addDays(now, 7);
      const alerts: AlertRecord[] = [];

      const canStock = isGranted(actor, "stock:read");
      const canDecideAbsence = isGranted(actor, "absence:decide");
      const canTasks = isGranted(actor, "task:read");

      const [levels, expiring, absences, tasks] = await Promise.all([
        canStock
          ? deps.stockRepository.listLevels(actor.organizationId)
          : Promise.resolve([]),
        canStock
          ? deps.stockRepository.expiringLots(
              actor.organizationId,
              inSevenDays,
            )
          : Promise.resolve([]),
        canDecideAbsence
          ? deps.scheduleRepository.listAbsences(actor.organizationId, {
              from: now,
              to: inSevenDays,
            })
          : Promise.resolve([]),
        canTasks
          ? deps.taskRepository.list(actor.organizationId, {
              from: now,
              to: inSevenDays,
              status: null,
              employeeId: null,
            })
          : Promise.resolve([]),
      ]);

      for (const level of levels.filter((row) => row.isBelowMin)) {
        alerts.push({
          id: `low:${level.siteId}:${level.itemId}`,
          kind: "LOW_STOCK",
          title: `${level.itemName} · ${level.siteName}`,
          description: `${level.quantity} / ${level.minStockQuantity} ${level.unitCode}`,
          href: "/dashboard/stock",
        });
      }

      for (const lot of expiring) {
        alerts.push({
          id: `expiry:${lot.id}`,
          kind: "EXPIRING_LOT",
          title: `${lot.lotNumber} · ${lot.itemName}`,
          description: `${lot.quantityRemaining} ${lot.unitCode} · ${lot.siteName} · ${day(lot.expiresOn)}`,
          href: `/dashboard/stock/lots/${lot.id}`,
        });
      }

      for (const absence of absences.filter(
        (row) => row.status === "REQUESTED",
      )) {
        alerts.push({
          id: `absence:${absence.id}`,
          kind: "PENDING_ABSENCE",
          title: absence.employeeName,
          description: `${absence.kind} · ${day(absence.startsAt)} → ${day(absence.endsAt)}`,
          href: "/dashboard/team/absences",
        });
      }

      for (const task of tasks.filter(
        (row) => row.employeeId === null && row.status !== "DONE",
      )) {
        alerts.push({
          id: `task:${task.id}`,
          kind: "UNASSIGNED_TASK",
          title: task.title,
          description: task.batchCode ?? task.recipeName ?? "",
          href: "/dashboard/production/tasks",
        });
      }

      return alerts;
    },
  };
}
