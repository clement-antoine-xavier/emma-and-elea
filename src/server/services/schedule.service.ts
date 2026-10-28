
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
  startOfWeek,
  addDays,
  zonedDateTimeToUtc,
  zonedParts,
} from "@/server/domain/schedule";
import type {
  AbsenceRecord,
  EmployeeAvailabilityRecord,
  EmployeeChoice,
  EmployeeOption,
  EmployeeProfileRecord,
  ShiftRecord,
} from "@/lib/dto";
import type {ScheduleRepository} from "@/server/repositories/schedule.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";

export type ScheduleFilters = {
  week?: string | string[];
  siteId?: string | string[];
};

export type EmployeeValues = {
  memberId: string;
  jobTitle: string | null;
  siteId: string | null;
  weeklyContractHours: string | null;
  hiredOn: Date | null;
  isActive: boolean;
};

export type AvailabilityValues = {
  weekday: number;
  startMinute: number;
  endMinute: number;
  validFrom: Date | null;
  validTo: Date | null;
};

export type AbsenceValues = {
  employeeId: string;
  kind: AbsenceRecord["kind"];
  startsAt: string;
  endsAt: string;
  note: string | null;
};

export type ShiftValues = {
  siteId: string;
  startsAt: string;
  endsAt: string;
  kind: ShiftRecord["kind"];
  note: string | null;
};

export interface ScheduleService {
  getEmployees(actor: Actor | null): Promise<{
    members: EmployeeChoice[];
    employees: EmployeeProfileRecord[];
    sites: {id: string; name: string; code: string}[];
    canWrite: boolean;
  }>;
  getEmployee(
    actor: Actor | null,
    id: string,
  ): Promise<{
    employee: EmployeeProfileRecord;
    availability: EmployeeAvailabilityRecord[];
    canWrite: boolean;
  } | null>;
  createEmployee(
    actor: Actor | null,
    input: EmployeeValues,
  ): Promise<{id: string}>;
  updateEmployee(
    actor: Actor | null,
    id: string,
    input: EmployeeValues,
  ): Promise<void>;
  addAvailability(
    actor: Actor | null,
    employeeId: string,
    input: AvailabilityValues,
  ): Promise<void>;
  removeAvailability(
    actor: Actor | null,
    employeeId: string,
    id: string,
  ): Promise<void>;
  getAbsences(
    actor: Actor | null,
    filters: {from?: string | string[]; to?: string | string[]},
  ): Promise<{
    absences: AbsenceRecord[];
    employees: EmployeeOption[];
    canRequest: boolean;
    canDecide: boolean;
    currentEmployee: EmployeeOption | null;
  }>;
  createAbsence(actor: Actor | null, input: AbsenceValues): Promise<void>;
  decideAbsence(
    actor: Actor | null,
    id: string,
    status: "APPROVED" | "REJECTED",
  ): Promise<void>;
  getSchedule(actor: Actor | null, filters: ScheduleFilters): Promise<{
    weekStart: Date;
    weekEnd: Date;
    shifts: ShiftRecord[];
    employees: EmployeeOption[];
    sites: {id: string; name: string; code: string}[];
    canWrite: boolean;
  }>;
  createShift(actor: Actor | null, input: ShiftValues): Promise<{id: string}>;
  removeShift(actor: Actor | null, id: string): Promise<void>;
  assignEmployee(
    actor: Actor | null,
    shiftId: string,
    employeeId: string,
    role: string | null,
  ): Promise<void>;
  removeAssignment(
    actor: Actor | null,
    shiftId: string,
    assignmentId: string,
  ): Promise<void>;
}

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function parseDate(value: string, fallback: Date): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function today(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function toEmployeeOption(employee: EmployeeProfileRecord): EmployeeOption {
  return {
    id: employee.id,
    name: employee.name,
    jobTitle: employee.jobTitle,
    siteId: employee.siteId,
    weeklyContractHours: employee.weeklyContractHours,
  };
}

export function createScheduleService(deps: {
  scheduleRepository: ScheduleRepository;
  siteRepository: SiteRepository;
}): ScheduleService {
  async function requireSite(organizationId: string, siteId: string) {
    const site = await deps.siteRepository.findById(organizationId, siteId);
    if (!site) throw new DomainError("NOT_FOUND");
    return site;
  }

  async function requireEmployee(organizationId: string, id: string) {
    const employee = await deps.scheduleRepository.findEmployee(
      organizationId,
      id,
    );
    if (!employee) throw new DomainError("NOT_FOUND");
    return employee;
  }

  return {
    async getEmployees(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:read");

      const [members, employees, sites] = await Promise.all([
        deps.scheduleRepository.listMembers(actor.organizationId),
        deps.scheduleRepository.listProfiles(actor.organizationId),
        deps.siteRepository.list(actor.organizationId),
      ]);

      return {
        members,
        employees,
        sites: sites
          .filter((site) => !site.archivedAt)
          .map((site) => ({id: site.id, name: site.name, code: site.code})),
        canWrite: isGranted(actor, "team:write"),
      };
    },

    async getEmployee(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:read");

      const employee = await deps.scheduleRepository.findEmployee(
        actor.organizationId,
        id,
      );
      if (!employee) return null;

      return {
        employee,
        availability: await deps.scheduleRepository.listAvailability(
          actor.organizationId,
          id,
        ),
        canWrite: isGranted(actor, "team:write"),
      };
    },

    async createEmployee(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      if (input.siteId) await requireSite(actor.organizationId, input.siteId);

      return {
        id: await deps.scheduleRepository.createEmployee(
          actor.organizationId,
          input,
        ),
      };
    },

    async updateEmployee(actorInput, id, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      if (input.siteId) await requireSite(actor.organizationId, input.siteId);
      await requireEmployee(actor.organizationId, id);

      const updated = await deps.scheduleRepository.updateEmployee(
        actor.organizationId,
        id,
        input,
      );
      if (!updated) throw new DomainError("NOT_FOUND");
    },

    async addAvailability(actorInput, employeeId, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      await requireEmployee(actor.organizationId, employeeId);
      if (input.startMinute >= input.endMinute) {
        throw new DomainError("INVALID_INPUT");
      }
      if (
        input.validFrom &&
        input.validTo &&
        input.validFrom > input.validTo
      ) {
        throw new DomainError("INVALID_INPUT");
      }

      await deps.scheduleRepository.addAvailability(
        actor.organizationId,
        employeeId,
        input,
      );
    },

    async removeAvailability(actorInput, employeeId, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      await deps.scheduleRepository.removeAvailability(
        actor.organizationId,
        employeeId,
        id,
      );
    },

    async getAbsences(actorInput, filters) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "absence:read");

      const from = parseDate(single(filters.from), addDays(today(), -7));
      const to = parseDate(single(filters.to), addDays(today(), 60));
      const canViewAll = isGranted(actor, "team:read");
      const current = await deps.scheduleRepository.findEmployeeByUser(
        actor.organizationId,
        actor.userId,
      );
      const employees = canViewAll
        ? (await deps.scheduleRepository.listProfiles(actor.organizationId))
            .filter((employee) => employee.isActive)
            .map(toEmployeeOption)
        : current
          ? [toEmployeeOption(current)]
          : [];
      const absences = await deps.scheduleRepository.listAbsences(
        actor.organizationId,
        {from, to},
      );

      return {
        absences: canViewAll
          ? absences
          : absences.filter(
              (absence) => absence.employeeId === current?.id,
            ),
        employees,
        canRequest: isGranted(actor, "absence:request"),
        canDecide: isGranted(actor, "absence:decide"),
        currentEmployee: current ? toEmployeeOption(current) : null,
      };
    },

    async createAbsence(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "absence:request");

      const canViewAll = isGranted(actor, "team:read");
      let employeeId = input.employeeId;
      if (!canViewAll) {
        const current = await deps.scheduleRepository.findEmployeeByUser(
          actor.organizationId,
          actor.userId,
        );
        if (!current) throw new DomainError("NOT_FOUND");
        employeeId = current.id;
      }

      const employee = await requireEmployee(
        actor.organizationId,
        employeeId,
      );
      const timeZone = employee.timeZone ?? "UTC";
      const startsAt = zonedDateTimeToUtc(input.startsAt, timeZone);
      const endsAt = zonedDateTimeToUtc(input.endsAt, timeZone);
      if (endsAt <= startsAt) throw new DomainError("INVALID_INPUT");

      await deps.scheduleRepository.createAbsence(actor.organizationId, {
        employeeId,
        kind: input.kind,
        startsAt,
        endsAt,
        note: input.note,
      });
    },

    async decideAbsence(actorInput, id, status) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "absence:decide");

      const absence = await deps.scheduleRepository.findAbsence(
        actor.organizationId,
        id,
      );
      if (!absence) throw new DomainError("NOT_FOUND");
      if (absence.status !== "REQUESTED") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      if (status === "APPROVED") {
        const overlapping =
          await deps.scheduleRepository.approvedAbsencesOverlapping(
            actor.organizationId,
            absence.employeeId,
            absence.startsAt,
            absence.endsAt,
          );
        if (overlapping.some((other) => other.id !== absence.id)) {
          throw new DomainError("CONFLICT");
        }
      }

      await deps.scheduleRepository.decideAbsence(
        actor.organizationId,
        id,
        status,
        actor.userId,
      );
    },

    async getSchedule(actorInput, filters) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:read");

      const weekStart = startOfWeek(
        parseDate(single(filters.week), today()),
      );
      const weekEnd = addDays(weekStart, 7);
      const requestedSite = single(filters.siteId);
      const sites = (await deps.siteRepository.list(actor.organizationId))
        .filter((site) => !site.archivedAt)
        .map((site) => ({id: site.id, name: site.name, code: site.code}));
      const siteId = sites.find((site) => site.id === requestedSite)?.id ?? null;
      const shifts = await deps.scheduleRepository.listShifts(
        actor.organizationId,
        {
          from: addDays(weekStart, -1),
          to: addDays(weekEnd, 1),
          siteId,
        },
      );
      const firstKey = weekStart.toISOString().slice(0, 10);
      const lastKey = addDays(weekStart, 6).toISOString().slice(0, 10);
      const employees = (
        await deps.scheduleRepository.listProfiles(actor.organizationId)
      )
        .filter((employee) => employee.isActive)
        .map(toEmployeeOption);

      return {
        weekStart,
        weekEnd,
        shifts: shifts.filter((shift) => {
          const key = zonedParts(shift.startsAt, shift.timeZone).dateKey;
          return key >= firstKey && key <= lastKey;
        }),
        employees,
        sites,
        canWrite: isGranted(actor, "team:write"),
      };
    },

    async createShift(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      const site = await requireSite(actor.organizationId, input.siteId);
      const startsAt = zonedDateTimeToUtc(input.startsAt, site.timezone);
      const endsAt = zonedDateTimeToUtc(input.endsAt, site.timezone);
      if (endsAt <= startsAt) throw new DomainError("INVALID_INPUT");

      return {
        id: await deps.scheduleRepository.createShift(actor.organizationId, {
          siteId: input.siteId,
          startsAt,
          endsAt,
          kind: input.kind,
          note: input.note,
        }),
      };
    },

    async removeShift(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      await deps.scheduleRepository.removeShift(actor.organizationId, id);
    },

    async assignEmployee(actorInput, shiftId, employeeId, role) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      const [shift, employee] = await Promise.all([
        deps.scheduleRepository.findShift(actor.organizationId, shiftId),
        requireEmployee(actor.organizationId, employeeId),
      ]);
      if (!shift) throw new DomainError("NOT_FOUND");
      if (!employee.isActive) {
        throw new DomainError("EMPLOYEE_UNAVAILABLE");
      }

      const start = zonedParts(shift.startsAt, shift.timeZone);
      const end = zonedParts(shift.endsAt, shift.timeZone);
      if (start.dateKey !== end.dateKey) {
        throw new DomainError("INVALID_INPUT");
      }

      const availability = await deps.scheduleRepository.listAvailability(
        actor.organizationId,
        employeeId,
      );
      if (
        !availabilityCovers(availability, {
          weekday: start.weekday,
          startMinute: start.minutes,
          endMinute: end.minutes,
          dateKey: start.dateKey,
        })
      ) {
        throw new DomainError("EMPLOYEE_UNAVAILABLE");
      }

      const absences =
        await deps.scheduleRepository.approvedAbsencesOverlapping(
          actor.organizationId,
          employeeId,
          shift.startsAt,
          shift.endsAt,
        );
      if (absences.some((absence) => absenceOverlaps(absence, shift))) {
        throw new DomainError("EMPLOYEE_UNAVAILABLE");
      }

      const overlapping =
        await deps.scheduleRepository.assignmentsOverlapping(
          actor.organizationId,
          employeeId,
          shift.startsAt,
          shift.endsAt,
        );
      if (overlapping.some((assignment) => shiftsOverlap(assignment, shift))) {
        throw new DomainError("SHIFT_CONFLICT");
      }

      await deps.scheduleRepository.addAssignment(
        actor.organizationId,
        shiftId,
        {employeeId, role},
      );
    },

    async removeAssignment(actorInput, shiftId, assignmentId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      await deps.scheduleRepository.removeAssignment(
        actor.organizationId,
        shiftId,
        assignmentId,
      );
    },
  };
}
