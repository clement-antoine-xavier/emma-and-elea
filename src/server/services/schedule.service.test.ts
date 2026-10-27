import type {OrgRole} from "@/lib/permissions";
import type {OrganizationActor} from "@/server/auth/types";
import type {ScheduleRepository} from "@/server/repositories/schedule.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import {createScheduleService} from "./schedule.service";

function actorFor(role: OrgRole): OrganizationActor {
  return {
    userId: "user_1",
    name: "Actor",
    email: "actor@example.com",
    platformRole: "user",
    isSupport: false,
    sessionId: "session_1",
    activeOrganizationId: "org_1",
    membershipId: "member_1",
    organizationId: "org_1",
    organization: {id: "org_1", name: "Bakery", slug: "bakery"},
    role,
  };
}

const site = {
  id: "site_1",
  code: "ATL",
  name: "Atelier",
  kind: "WORKSHOP" as const,
  city: null,
  timezone: "Europe/Paris",
  isActive: true,
  archivedAt: null,
};

const employee = {
  id: "employee_1",
  memberId: "member_1",
  userId: "user_1",
  name: "Baker",
  email: "baker@example.com",
  role: "staff",
  siteId: "site_1",
  siteName: "Atelier",
  timeZone: "Europe/Paris",
  jobTitle: "Baker",
  weeklyContractHours: "35",
  hiredOn: null,
  isActive: true,
  availabilityCount: 1,
};

const shift = {
  id: "shift_1",
  siteId: "site_1",
  siteName: "Atelier",
  timeZone: "Europe/Paris",
  startsAt: new Date("2026-11-02T08:00:00.000Z"), // 09:00 local
  endsAt: new Date("2026-11-02T12:00:00.000Z"), // 13:00 local
  kind: "PRODUCTION" as const,
  note: null,
  assignments: [],
};

function scheduleRepository(
  overrides: Partial<ScheduleRepository> = {},
): ScheduleRepository {
  return {
    listMembers: jest.fn().mockResolvedValue([]),
    listProfiles: jest.fn().mockResolvedValue([employee]),
    findEmployee: jest.fn().mockResolvedValue(employee),
    findEmployeeByUser: jest.fn().mockResolvedValue(employee),
    createEmployee: jest.fn().mockResolvedValue("employee_1"),
    updateEmployee: jest.fn().mockResolvedValue(true),
    listAvailability: jest.fn().mockResolvedValue([
      {
        id: "availability_1",
        weekday: 0,
        startMinute: 8 * 60,
        endMinute: 18 * 60,
        validFrom: null,
        validTo: null,
      },
    ]),
    addAvailability: jest.fn().mockResolvedValue("availability_1"),
    removeAvailability: jest.fn().mockResolvedValue(undefined),
    listAbsences: jest.fn().mockResolvedValue([]),
    findAbsence: jest.fn(),
    createAbsence: jest.fn().mockResolvedValue("absence_1"),
    decideAbsence: jest.fn().mockResolvedValue(undefined),
    listShifts: jest.fn().mockResolvedValue([shift]),
    findShift: jest.fn().mockResolvedValue(shift),
    createShift: jest.fn().mockResolvedValue("shift_1"),
    removeShift: jest.fn().mockResolvedValue(undefined),
    addAssignment: jest.fn().mockResolvedValue("assignment_1"),
    removeAssignment: jest.fn().mockResolvedValue(undefined),
    assignmentsOverlapping: jest.fn().mockResolvedValue([]),
    approvedAbsencesOverlapping: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as ScheduleRepository;
}

function siteRepository(): SiteRepository {
  return {
    list: jest.fn().mockResolvedValue([site]),
    findById: jest.fn().mockResolvedValue(site),
  } as unknown as SiteRepository;
}

function service(schedule: Partial<ScheduleRepository> = {}) {
  return createScheduleService({
    scheduleRepository: scheduleRepository(schedule),
    siteRepository: siteRepository(),
  });
}

describe("schedule service", () => {
  it("converts shift wall clock to UTC using the site timezone", async () => {
    const schedule = scheduleRepository();
    const scheduleService = service(schedule);

    await scheduleService.createShift(actorFor("production_manager"), {
      siteId: "site_1",
      startsAt: "2026-11-02T09:00",
      endsAt: "2026-11-02T13:00",
      kind: "PRODUCTION",
      note: null,
    });

    expect(schedule.createShift).toHaveBeenCalledWith("org_1", {
      siteId: "site_1",
      startsAt: new Date("2026-11-02T08:00:00.000Z"),
      endsAt: new Date("2026-11-02T12:00:00.000Z"),
      kind: "PRODUCTION",
      note: null,
    });
  });

  it("assigns an employee whose availability covers the shift", async () => {
    const schedule = scheduleRepository();
    const scheduleService = service(schedule);

    await scheduleService.assignEmployee(
      actorFor("production_manager"),
      "shift_1",
      "employee_1",
      "Oven",
    );

    expect(schedule.addAssignment).toHaveBeenCalledWith(
      "org_1",
      "shift_1",
      {employeeId: "employee_1", role: "Oven"},
    );
  });

  it("rejects a shift outside the declared availability", async () => {
    const schedule = scheduleRepository({
      listAvailability: jest.fn().mockResolvedValue([
        {
          id: "availability_1",
          weekday: 0,
          startMinute: 14 * 60,
          endMinute: 18 * 60,
          validFrom: null,
          validTo: null,
        },
      ]),
    });

    await expect(
      service(schedule).assignEmployee(
        actorFor("production_manager"),
        "shift_1",
        "employee_1",
        null,
      ),
    ).rejects.toMatchObject({code: "EMPLOYEE_UNAVAILABLE"});
  });

  it("rejects an approved absence overlap", async () => {
    const schedule = scheduleRepository({
      approvedAbsencesOverlapping: jest.fn().mockResolvedValue([
        {
          id: "absence_1",
          startsAt: new Date("2026-11-02T08:30:00.000Z"),
          endsAt: new Date("2026-11-02T09:30:00.000Z"),
        },
      ]),
    });

    await expect(
      service(schedule).assignEmployee(
        actorFor("production_manager"),
        "shift_1",
        "employee_1",
        null,
      ),
    ).rejects.toMatchObject({code: "EMPLOYEE_UNAVAILABLE"});
  });

  it("rejects an overlapping shift", async () => {
    const schedule = scheduleRepository({
      assignmentsOverlapping: jest.fn().mockResolvedValue([
        {
          id: "assignment_other",
          startsAt: new Date("2026-11-02T09:00:00.000Z"),
          endsAt: new Date("2026-11-02T11:00:00.000Z"),
        },
      ]),
    });

    await expect(
      service(schedule).assignEmployee(
        actorFor("production_manager"),
        "shift_1",
        "employee_1",
        null,
      ),
    ).rejects.toMatchObject({code: "SHIFT_CONFLICT"});
  });

  it("forces staff absence requests onto their own employee profile", async () => {
    const schedule = scheduleRepository();
    const scheduleService = service(schedule);

    await scheduleService.createAbsence(actorFor("staff"), {
      employeeId: "someone_else",
      kind: "VACATION",
      startsAt: "2026-11-10T09:00",
      endsAt: "2026-11-11T09:00",
      note: null,
    });

    expect(schedule.createAbsence).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({employeeId: "employee_1"}),
    );
  });

  it("keeps schedule writes away from stock managers", async () => {
    await expect(
      service().createShift(actorFor("stock_manager"), {
        siteId: "site_1",
        startsAt: "2026-11-02T09:00",
        endsAt: "2026-11-02T13:00",
        kind: "PRODUCTION",
        note: null,
      }),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});
