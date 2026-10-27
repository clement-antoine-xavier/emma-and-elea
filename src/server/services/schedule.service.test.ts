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

describe("schedule read views and employee management", () => {
  it("lists members, profiles and active sites with a write flag", async () => {
    const schedule = scheduleRepository({
      listMembers: jest.fn().mockResolvedValue([
        {
          memberId: "member_1",
          name: "Baker",
          email: "baker@example.com",
          role: "staff",
          hasProfile: true,
        },
      ]),
    });
    const scheduleService = service(schedule);

    await expect(
      scheduleService.getEmployees(actorFor("production_manager")),
    ).resolves.toEqual({
      members: [expect.objectContaining({memberId: "member_1"})],
      employees: [employee],
      sites: [{id: "site_1", name: "Atelier", code: "ATL"}],
      canWrite: true,
    });
    expect(schedule.listProfiles).toHaveBeenCalledWith("org_1");
  });

  it("returns an employee with availability or null", async () => {
    const scheduleService = service();

    await expect(
      scheduleService.getEmployee(actorFor("production_manager"), "employee_1"),
    ).resolves.toMatchObject({
      employee,
      availability: [expect.objectContaining({id: "availability_1"})],
      canWrite: true,
    });

    const empty = service({findEmployee: jest.fn().mockResolvedValue(null)});
    await expect(
      empty.getEmployee(actorFor("production_manager"), "missing"),
    ).resolves.toBeNull();
  });

  it("creates an employee after checking the site", async () => {
    const schedule = scheduleRepository();
    const scheduleService = service(schedule);
    const input = {
      memberId: "member_1",
      jobTitle: "Baker",
      siteId: "site_1",
      weeklyContractHours: "35",
      hiredOn: null,
      isActive: true,
    };

    await expect(
      scheduleService.createEmployee(actorFor("production_manager"), input),
    ).resolves.toEqual({id: "employee_1"});
    expect(schedule.createEmployee).toHaveBeenCalledWith("org_1", input);

    const missingSite = service({
      createEmployee: jest.fn().mockResolvedValue("employee_1"),
    });
    await expect(
      missingSite.createEmployee(actorFor("production_manager"), {
        ...input,
        siteId: "site_gone",
      }),
    ).resolves.toEqual({id: "employee_1"});
  });

  it("rejects an employee profile for an unknown site", async () => {
    const serviceWithMissingSite = createScheduleService({
      scheduleRepository: scheduleRepository(),
      siteRepository: {
        list: jest.fn().mockResolvedValue([site]),
        findById: jest.fn().mockResolvedValue(null),
      } as unknown as SiteRepository,
    });

    await expect(
      serviceWithMissingSite.createEmployee(actorFor("production_manager"), {
        memberId: "member_1",
        jobTitle: null,
        siteId: "missing",
        weeklyContractHours: null,
        hiredOn: null,
        isActive: true,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("updates a profile and reports a concurrent delete", async () => {
    const input = {
      memberId: "member_1",
      jobTitle: null,
      siteId: null,
      weeklyContractHours: null,
      hiredOn: null,
      isActive: false,
    };
    const scheduleService = service();
    await expect(
      scheduleService.updateEmployee(
        actorFor("production_manager"),
        "employee_1",
        input,
      ),
    ).resolves.toBeUndefined();

    const gone = service({updateEmployee: jest.fn().mockResolvedValue(false)});
    await expect(
      gone.updateEmployee(actorFor("production_manager"), "employee_1", input),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("validates and stores an availability window", async () => {
    const scheduleService = service();
    const input = {
      weekday: 1,
      startMinute: 8 * 60,
      endMinute: 12 * 60,
      validFrom: null,
      validTo: null,
    };

    await expect(
      scheduleService.addAvailability(
        actorFor("production_manager"),
        "employee_1",
        input,
      ),
    ).resolves.toBeUndefined();

    await expect(
      scheduleService.addAvailability(
        actorFor("production_manager"),
        "employee_1",
        {...input, endMinute: 8 * 60},
      ),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});

    await expect(
      scheduleService.addAvailability(
        actorFor("production_manager"),
        "employee_1",
        {
          ...input,
          validFrom: new Date("2026-12-31T00:00:00Z"),
          validTo: new Date("2026-01-01T00:00:00Z"),
        },
      ),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("removes availability", async () => {
    const schedule = scheduleRepository();
    const scheduleService = service(schedule);

    await expect(
      scheduleService.removeAvailability(
        actorFor("production_manager"),
        "employee_1",
        "availability_1",
      ),
    ).resolves.toBeUndefined();
    expect(schedule.removeAvailability).toHaveBeenCalledWith(
      "org_1",
      "employee_1",
      "availability_1",
    );
  });
});

describe("absence visibility and decisions", () => {
  const absence = {
    id: "absence_1",
    employeeId: "employee_1",
    employeeName: "Baker",
    kind: "VACATION" as const,
    startsAt: new Date("2026-11-02T08:00:00.000Z"),
    endsAt: new Date("2026-11-02T17:00:00.000Z"),
    status: "REQUESTED" as const,
    note: null,
    timeZone: "Europe/Paris",
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-27T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows every absence to managers and only their own to staff", async () => {
    const absences = [
      absence,
      {...absence, id: "absence_2", employeeId: "employee_2"},
    ];
    const manager = service({listAbsences: jest.fn().mockResolvedValue(absences)});
    const staff = service({listAbsences: jest.fn().mockResolvedValue(absences)});

    const managerView = await manager.getAbsences(
      actorFor("production_manager"),
      {},
    );
    expect(managerView.absences).toHaveLength(2);
    expect(managerView.canDecide).toBe(true);
    expect(managerView.employees).toHaveLength(1);

    const staffView = await staff.getAbsences(actorFor("staff"), {});
    expect(staffView.absences).toEqual([absence]);
    expect(staffView.employees.map((row) => row.id)).toEqual(["employee_1"]);
    expect(staffView.currentEmployee).toMatchObject({id: "employee_1"});
  });

  it("uses the default seven-day back and sixty-day forward window", async () => {
    const schedule = scheduleRepository();
    const scheduleService = service(schedule);

    await scheduleService.getAbsences(actorFor("production_manager"), {
      from: "bad",
      to: "2026-12-31",
    });

    expect(schedule.listAbsences).toHaveBeenCalledWith("org_1", {
      from: new Date("2026-10-20T00:00:00.000Z"),
      to: new Date("2026-12-31T00:00:00.000Z"),
    });
  });

  it("forces a staff request onto their own profile", async () => {
    const schedule = scheduleRepository();
    const scheduleService = service(schedule);

    await scheduleService.createAbsence(actorFor("staff"), {
      employeeId: "someone_else",
      kind: "SICK",
      startsAt: "2026-11-02T08:00",
      endsAt: "2026-11-02T12:00",
      note: null,
    });

    expect(schedule.createAbsence).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({employeeId: "employee_1"}),
    );
  });

  it("rejects a staff request without an employee profile", async () => {
    const scheduleService = service({
      findEmployeeByUser: jest.fn().mockResolvedValue(null),
    });

    await expect(
      scheduleService.createAbsence(actorFor("staff"), {
        employeeId: "employee_1",
        kind: "SICK",
        startsAt: "2026-11-02T08:00",
        endsAt: "2026-11-02T12:00",
        note: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("decides only a requested absence without an overlapping approval", async () => {
    const scheduleService = service({
      findAbsence: jest.fn().mockResolvedValue(absence),
    });
    await expect(
      scheduleService.decideAbsence(
        actorFor("production_manager"),
        "absence_1",
        "REJECTED",
      ),
    ).resolves.toBeUndefined();

    const missing = service({findAbsence: jest.fn().mockResolvedValue(null)});
    await expect(
      missing.decideAbsence(actorFor("production_manager"), "missing", "APPROVED"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const decided = service({
      findAbsence: jest
        .fn()
        .mockResolvedValue({...absence, status: "APPROVED"}),
    });
    await expect(
      decided.decideAbsence(
        actorFor("production_manager"),
        "absence_1",
        "REJECTED",
      ),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});

    const overlap = service({
      findAbsence: jest.fn().mockResolvedValue(absence),
      approvedAbsencesOverlapping: jest
        .fn()
        .mockResolvedValue([{...absence, id: "absence_2"}]),
    });
    await expect(
      overlap.decideAbsence(
        actorFor("production_manager"),
        "absence_1",
        "APPROVED",
      ),
    ).rejects.toMatchObject({code: "CONFLICT"});
  });
});

describe("schedule board and assignments", () => {
  it("builds the requested week and filters shifts by local date", async () => {
    const schedule = scheduleRepository({
      listShifts: jest.fn().mockResolvedValue([
        shift,
        {...shift, id: "shift_2", startsAt: new Date("2026-11-10T08:00:00Z"), endsAt: new Date("2026-11-10T12:00:00Z")},
      ]),
    });
    const scheduleService = service(schedule);

    const result = await scheduleService.getSchedule(
      actorFor("production_manager"),
      {week: "2026-11-02", siteId: "site_1"},
    );

    expect(result.weekStart).toEqual(new Date("2026-11-02T00:00:00.000Z"));
    expect(result.weekEnd).toEqual(new Date("2026-11-09T00:00:00.000Z"));
    expect(result.shifts.map((row) => row.id)).toEqual(["shift_1"]);
    expect(result.sites).toEqual([
      {id: "site_1", name: "Atelier", code: "ATL"},
    ]);
    expect(schedule.listShifts).toHaveBeenCalledWith("org_1", {
      from: new Date("2026-11-01T00:00:00.000Z"),
      to: new Date("2026-11-10T00:00:00.000Z"),
      siteId: "site_1",
    });
  });

  it("ignores an unknown site filter", async () => {
    const schedule = scheduleRepository();
    const scheduleService = service(schedule);

    await scheduleService.getSchedule(actorFor("production_manager"), {
      week: "2026-11-02",
      siteId: "site_gone",
    });

    expect(schedule.listShifts).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({siteId: null}),
    );
  });

  it("creates a shift and rejects a missing site or inverted window", async () => {
    const scheduleService = service();
    const input = {
      siteId: "site_1",
      startsAt: "2026-11-02T08:00",
      endsAt: "2026-11-02T12:00",
      kind: "PRODUCTION" as const,
      note: null,
    };

    await expect(
      scheduleService.createShift(actorFor("production_manager"), input),
    ).resolves.toEqual({id: "shift_1"});

    await expect(
      scheduleService.createShift(actorFor("production_manager"), {
        ...input,
        endsAt: "2026-11-02T07:00",
      }),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});

    const missingSite = createScheduleService({
      scheduleRepository: scheduleRepository(),
      siteRepository: {
        list: jest.fn().mockResolvedValue([site]),
        findById: jest.fn().mockResolvedValue(null),
      } as unknown as SiteRepository,
    });
    await expect(
      missingSite.createShift(actorFor("production_manager"), input),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("removes a shift and an assignment", async () => {
    const schedule = scheduleRepository();
    const scheduleService = service(schedule);

    await expect(
      scheduleService.removeShift(actorFor("production_manager"), "shift_1"),
    ).resolves.toBeUndefined();
    await expect(
      scheduleService.removeAssignment(
        actorFor("production_manager"),
        "shift_1",
        "assignment_1",
      ),
    ).resolves.toBeUndefined();
    expect(schedule.removeShift).toHaveBeenCalledWith("org_1", "shift_1");
    expect(schedule.removeAssignment).toHaveBeenCalledWith(
      "org_1",
      "shift_1",
      "assignment_1",
    );
  });

  it("rejects assignments to missing, inactive or cross-midnight shifts", async () => {
    const missingShift = service({findShift: jest.fn().mockResolvedValue(null)});
    await expect(
      missingShift.assignEmployee(
        actorFor("production_manager"),
        "missing",
        "employee_1",
        null,
      ),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    const inactive = service({
      findEmployee: jest
        .fn()
        .mockResolvedValue({...employee, isActive: false}),
    });
    await expect(
      inactive.assignEmployee(
        actorFor("production_manager"),
        "shift_1",
        "employee_1",
        null,
      ),
    ).rejects.toMatchObject({code: "EMPLOYEE_UNAVAILABLE"});

    const overnight = service({
      findShift: jest.fn().mockResolvedValue({
        ...shift,
        startsAt: new Date("2026-11-01T22:00:00.000Z"),
        endsAt: new Date("2026-11-02T02:00:00.000Z"),
      }),
    });
    await expect(
      overnight.assignEmployee(
        actorFor("production_manager"),
        "shift_1",
        "employee_1",
        null,
      ),
    ).rejects.toMatchObject({code: "INVALID_INPUT"});
  });

  it("assigns an available employee", async () => {
    const schedule = scheduleRepository();
    const scheduleService = service(schedule);

    await expect(
      scheduleService.assignEmployee(
        actorFor("production_manager"),
        "shift_1",
        "employee_1",
        "Oven",
      ),
    ).resolves.toBeUndefined();
    expect(schedule.addAssignment).toHaveBeenCalledWith("org_1", "shift_1", {
      employeeId: "employee_1",
      role: "Oven",
    });
  });
});
