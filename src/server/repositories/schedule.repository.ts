import {prisma} from "@/lib/prisma";
import type {
  AbsenceRecord,
  AssignmentStatusName,
  EmployeeAvailabilityRecord,
  EmployeeChoice,
  EmployeeProfileRecord,
  ShiftAssignmentRecord,
  ShiftRecord,
} from "@/lib/dto";
import {DomainError} from "@/server/domain/errors";

export type EmployeeInput = {
  memberId: string;
  jobTitle: string | null;
  siteId: string | null;
  weeklyContractHours: string | null;
  hiredOn: Date | null;
  isActive: boolean;
};

export type AvailabilityInput = {
  weekday: number;
  startMinute: number;
  endMinute: number;
  validFrom: Date | null;
  validTo: Date | null;
};

export type AbsenceInput = {
  employeeId: string;
  kind: AbsenceRecord["kind"];
  startsAt: Date;
  endsAt: Date;
  note: string | null;
};

export type ShiftInput = {
  siteId: string;
  startsAt: Date;
  endsAt: Date;
  kind: ShiftRecord["kind"];
  note: string | null;
};

export interface ScheduleRepository {
  listMembers(organizationId: string): Promise<EmployeeChoice[]>;
  listProfiles(organizationId: string): Promise<EmployeeProfileRecord[]>;
  findEmployee(
    organizationId: string,
    id: string,
  ): Promise<EmployeeProfileRecord | null>;
  findEmployeeByUser(
    organizationId: string,
    userId: string,
  ): Promise<EmployeeProfileRecord | null>;
  createEmployee(
    organizationId: string,
    input: EmployeeInput,
  ): Promise<string>;
  updateEmployee(
    organizationId: string,
    id: string,
    input: EmployeeInput,
  ): Promise<boolean>;
  listAvailability(
    organizationId: string,
    employeeId: string,
  ): Promise<EmployeeAvailabilityRecord[]>;
  addAvailability(
    organizationId: string,
    employeeId: string,
    input: AvailabilityInput,
  ): Promise<string>;
  removeAvailability(
    organizationId: string,
    employeeId: string,
    id: string,
  ): Promise<void>;
  listAbsences(
    organizationId: string,
    filters: {from: Date; to: Date},
  ): Promise<AbsenceRecord[]>;
  findAbsence(
    organizationId: string,
    id: string,
  ): Promise<AbsenceRecord | null>;
  createAbsence(
    organizationId: string,
    input: AbsenceInput,
  ): Promise<string>;
  decideAbsence(
    organizationId: string,
    id: string,
    status: "APPROVED" | "REJECTED",
    decidedById: string,
  ): Promise<void>;
  listShifts(
    organizationId: string,
    filters: {from: Date; to: Date; siteId: string | null},
  ): Promise<ShiftRecord[]>;
  findShift(
    organizationId: string,
    id: string,
  ): Promise<ShiftRecord | null>;
  createShift(organizationId: string, input: ShiftInput): Promise<string>;
  removeShift(organizationId: string, id: string): Promise<void>;
  addAssignment(
    organizationId: string,
    shiftId: string,
    input: {employeeId: string; role: string | null},
  ): Promise<string>;
  removeAssignment(
    organizationId: string,
    shiftId: string,
    id: string,
  ): Promise<void>;
  assignmentsOverlapping(
    organizationId: string,
    employeeId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<{id: string; startsAt: Date; endsAt: Date}[]>;
  approvedAbsencesOverlapping(
    organizationId: string,
    employeeId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<{id: string; startsAt: Date; endsAt: Date}[]>;
}

const employeeSelect = {
  id: true,
  memberId: true,
  siteId: true,
  jobTitle: true,
  weeklyContractHours: true,
  hiredOn: true,
  isActive: true,
  member: {
    select: {
      userId: true,
      role: true,
      user: {select: {name: true, email: true}},
    },
  },
  site: {select: {name: true, timezone: true}},
  _count: {select: {availability: true}},
} as const;

type SelectedEmployee = {
  id: string;
  memberId: string;
  siteId: string | null;
  jobTitle: string | null;
  weeklyContractHours: {toString(): string} | null;
  hiredOn: Date | null;
  isActive: boolean;
  member: {
    userId: string;
    role: string;
    user: {name: string; email: string};
  };
  site: {name: string; timezone: string} | null;
  _count: {availability: number};
};

function toEmployee(employee: SelectedEmployee): EmployeeProfileRecord {
  return {
    id: employee.id,
    memberId: employee.memberId,
    userId: employee.member.userId,
    name: employee.member.user.name,
    email: employee.member.user.email,
    role: employee.member.role,
    siteId: employee.siteId,
    siteName: employee.site?.name ?? null,
    timeZone: employee.site?.timezone ?? null,
    jobTitle: employee.jobTitle,
    weeklyContractHours:
      employee.weeklyContractHours?.toString() ?? null,
    hiredOn: employee.hiredOn,
    isActive: employee.isActive,
    availabilityCount: employee._count.availability,
  };
}

const absenceSelect = {
  id: true,
  kind: true,
  startsAt: true,
  endsAt: true,
  status: true,
  note: true,
  employeeId: true,
  employee: {
    select: {
      member: {select: {user: {select: {name: true}}}},
      site: {select: {timezone: true}},
    },
  },
} as const;

type SelectedAbsence = {
  id: string;
  kind: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  note: string | null;
  employeeId: string;
  employee: {
    member: {user: {name: string}};
    site: {timezone: string} | null;
  };
};

function toAbsence(absence: SelectedAbsence): AbsenceRecord {
  return {
    id: absence.id,
    employeeId: absence.employeeId,
    employeeName: absence.employee.member.user.name,
    kind: absence.kind as AbsenceRecord["kind"],
    startsAt: absence.startsAt,
    endsAt: absence.endsAt,
    status: absence.status as AbsenceRecord["status"],
    note: absence.note,
    timeZone: absence.employee.site?.timezone ?? "UTC",
  };
}

const shiftSelect = {
  id: true,
  siteId: true,
  startsAt: true,
  endsAt: true,
  kind: true,
  note: true,
  site: {select: {name: true, timezone: true}},
  assignments: {
    orderBy: {createdAt: "asc"},
    select: {
      id: true,
      employeeId: true,
      role: true,
      status: true,
      employee: {
        select: {member: {select: {user: {select: {name: true}}}}},
      },
    },
  },
} as const;

type SelectedShift = {
  id: string;
  siteId: string;
  startsAt: Date;
  endsAt: Date;
  kind: string;
  note: string | null;
  site: {name: string; timezone: string};
  assignments: {
    id: string;
    employeeId: string;
    role: string | null;
    status: string;
    employee: {member: {user: {name: string}}};
  }[];
};

function toShift(shift: SelectedShift): ShiftRecord {
  const assignments: ShiftAssignmentRecord[] = shift.assignments.map(
    (assignment) => ({
      id: assignment.id,
      employeeId: assignment.employeeId,
      employeeName: assignment.employee.member.user.name,
      role: assignment.role,
      status: assignment.status as AssignmentStatusName,
    }),
  );

  return {
    id: shift.id,
    siteId: shift.siteId,
    siteName: shift.site.name,
    timeZone: shift.site.timezone,
    startsAt: shift.startsAt,
    endsAt: shift.endsAt,
    kind: shift.kind as ShiftRecord["kind"],
    note: shift.note,
    assignments,
  };
}

export const scheduleRepository: ScheduleRepository = {
  async listMembers(organizationId) {
    const members = await prisma.member.findMany({
      where: {organizationId},
      orderBy: {user: {name: "asc"}},
      select: {
        id: true,
        role: true,
        user: {select: {name: true, email: true}},
        employeeProfile: {select: {id: true}},
      },
    });

    return members.map((member) => ({
      memberId: member.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      hasProfile: member.employeeProfile !== null,
    }));
  },

  async listProfiles(organizationId) {
    const employees = await prisma.employeeProfile.findMany({
      where: {organizationId, archivedAt: null},
      orderBy: {member: {user: {name: "asc"}}},
      select: employeeSelect,
    });

    return employees.map(toEmployee);
  },

  async findEmployee(organizationId, id) {
    const employee = await prisma.employeeProfile.findFirst({
      where: {id, organizationId, archivedAt: null},
      select: employeeSelect,
    });

    return employee ? toEmployee(employee) : null;
  },

  async findEmployeeByUser(organizationId, userId) {
    const employee = await prisma.employeeProfile.findFirst({
      where: {
        organizationId,
        archivedAt: null,
        member: {userId},
      },
      select: employeeSelect,
    });

    return employee ? toEmployee(employee) : null;
  },

  async createEmployee(organizationId, input) {
    const member = await prisma.member.findFirst({
      where: {id: input.memberId, organizationId},
      select: {id: true, employeeProfile: {select: {id: true}}},
    });
    if (!member) throw new DomainError("NOT_FOUND");
    if (member.employeeProfile) throw new DomainError("CONFLICT");

    const employee = await prisma.employeeProfile.create({
      data: {organizationId, ...input},
      select: {id: true},
    });

    return employee.id;
  },

  async updateEmployee(organizationId, id, input) {
    const result = await prisma.employeeProfile.updateMany({
      where: {id, organizationId, archivedAt: null},
      data: {
        siteId: input.siteId,
        jobTitle: input.jobTitle,
        weeklyContractHours: input.weeklyContractHours,
        hiredOn: input.hiredOn,
        isActive: input.isActive,
      },
    });

    return result.count > 0;
  },

  async listAvailability(organizationId, employeeId) {
    const rows = await prisma.availability.findMany({
      where: {organizationId, employeeId},
      orderBy: [{weekday: "asc"}, {startMinute: "asc"}],
      select: {
        id: true,
        weekday: true,
        startMinute: true,
        endMinute: true,
        validFrom: true,
        validTo: true,
      },
    });

    return rows;
  },

  async addAvailability(organizationId, employeeId, input) {
    const employee = await prisma.employeeProfile.findFirst({
      where: {id: employeeId, organizationId, archivedAt: null},
      select: {id: true},
    });
    if (!employee) throw new DomainError("NOT_FOUND");

    const existing = await prisma.availability.findFirst({
      where: {
        employeeId,
        weekday: input.weekday,
        startMinute: input.startMinute,
      },
      select: {id: true},
    });
    if (existing) throw new DomainError("CONFLICT");

    const row = await prisma.availability.create({
      data: {organizationId, employeeId, ...input},
      select: {id: true},
    });

    return row.id;
  },

  async removeAvailability(organizationId, employeeId, id) {
    const result = await prisma.availability.deleteMany({
      where: {id, employeeId, organizationId},
    });
    if (result.count === 0) throw new DomainError("NOT_FOUND");
  },

  async listAbsences(organizationId, filters) {
    const rows = await prisma.absence.findMany({
      where: {
        organizationId,
        startsAt: {lt: filters.to},
        endsAt: {gt: filters.from},
      },
      orderBy: {startsAt: "asc"},
      select: absenceSelect,
    });

    return rows.map(toAbsence);
  },

  async findAbsence(organizationId, id) {
    const row = await prisma.absence.findFirst({
      where: {id, organizationId},
      select: absenceSelect,
    });

    return row ? toAbsence(row) : null;
  },

  async createAbsence(organizationId, input) {
    const employee = await prisma.employeeProfile.findFirst({
      where: {
        id: input.employeeId,
        organizationId,
        archivedAt: null,
      },
      select: {id: true},
    });
    if (!employee) throw new DomainError("NOT_FOUND");

    const absence = await prisma.absence.create({
      data: {organizationId, ...input},
      select: {id: true},
    });

    return absence.id;
  },

  async decideAbsence(organizationId, id, status, decidedById) {
    const result = await prisma.absence.updateMany({
      where: {id, organizationId, status: "REQUESTED"},
      data: {status, decidedById},
    });
    if (result.count === 0) {
      throw new DomainError("INVALID_STATE_TRANSITION");
    }
  },

  async listShifts(organizationId, filters) {
    const shifts = await prisma.shift.findMany({
      where: {
        organizationId,
        siteId: filters.siteId ?? undefined,
        startsAt: {lt: filters.to},
        endsAt: {gt: filters.from},
      },
      orderBy: {startsAt: "asc"},
      select: shiftSelect,
    });

    return shifts.map(toShift);
  },

  async findShift(organizationId, id) {
    const shift = await prisma.shift.findFirst({
      where: {id, organizationId},
      select: shiftSelect,
    });

    return shift ? toShift(shift) : null;
  },

  async createShift(organizationId, input) {
    const shift = await prisma.shift.create({
      data: {organizationId, ...input},
      select: {id: true},
    });

    return shift.id;
  },

  async removeShift(organizationId, id) {
    const result = await prisma.shift.deleteMany({
      where: {id, organizationId},
    });
    if (result.count === 0) throw new DomainError("NOT_FOUND");
  },

  async addAssignment(organizationId, shiftId, input) {
    const assignment = await prisma.shiftAssignment.create({
      data: {organizationId, shiftId, ...input},
      select: {id: true},
    });

    return assignment.id;
  },

  async removeAssignment(organizationId, shiftId, id) {
    const result = await prisma.shiftAssignment.deleteMany({
      where: {id, shiftId, organizationId},
    });
    if (result.count === 0) throw new DomainError("NOT_FOUND");
  },

  async assignmentsOverlapping(
    organizationId,
    employeeId,
    startsAt,
    endsAt,
  ) {
    const rows = await prisma.shiftAssignment.findMany({
      where: {
        organizationId,
        employeeId,
        shift: {
          startsAt: {lt: endsAt},
          endsAt: {gt: startsAt},
        },
      },
      orderBy: {shift: {startsAt: "asc"}},
      select: {
        id: true,
        shift: {select: {startsAt: true, endsAt: true}},
      },
    });

    return rows.map((row) => ({
      id: row.id,
      startsAt: row.shift.startsAt,
      endsAt: row.shift.endsAt,
    }));
  },

  async approvedAbsencesOverlapping(
    organizationId,
    employeeId,
    startsAt,
    endsAt,
  ) {
    const rows = await prisma.absence.findMany({
      where: {
        organizationId,
        employeeId,
        status: "APPROVED",
        startsAt: {lt: endsAt},
        endsAt: {gt: startsAt},
      },
      orderBy: {startsAt: "asc"},
      select: {id: true, startsAt: true, endsAt: true},
    });

    return rows;
  },
};
