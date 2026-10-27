import {scheduleRepository} from "@/server/repositories/schedule.repository";
import {createFixture, type Fixture} from "@/test-utils/integration/db";

const monday = new Date("2026-11-02T00:00:00.000Z");

describe("schedule repository", () => {
  let fixture: Fixture;
  let employeeId: string;
  let shiftId: string;

  beforeAll(async () => {
    fixture = await createFixture();
    employeeId = await scheduleRepository.createEmployee(
      fixture.organizationId,
      {
        memberId: fixture.memberId,
        jobTitle: "Baker",
        siteId: fixture.siteId,
        weeklyContractHours: "35",
        hiredOn: new Date("2026-01-15T00:00:00.000Z"),
        isActive: true,
      },
    );
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("creates an employee profile and exposes it in the team lists", async () => {
    const profiles = await scheduleRepository.listProfiles(
      fixture.organizationId,
    );
    expect(profiles).toEqual([
      expect.objectContaining({
        id: employeeId,
        memberId: fixture.memberId,
        name: "Integration actor",
        jobTitle: "Baker",
        siteName: "Atelier",
        weeklyContractHours: "35",
        isActive: true,
      }),
    ]);

    await expect(
      scheduleRepository.findEmployee(fixture.organizationId, employeeId),
    ).resolves.toMatchObject({id: employeeId, timeZone: "Europe/Paris"});
    await expect(
      scheduleRepository.findEmployeeByUser(
        fixture.organizationId,
        fixture.userId,
      ),
    ).resolves.toMatchObject({id: employeeId});

    const members = await scheduleRepository.listMembers(
      fixture.organizationId,
    );
    expect(members).toEqual([
      expect.objectContaining({
        memberId: fixture.memberId,
        hasProfile: true,
        role: "owner",
      }),
    ]);
  });

  it("updates a profile", async () => {
    const updated = await scheduleRepository.updateEmployee(
      fixture.organizationId,
      employeeId,
      {
        memberId: fixture.memberId,
        jobTitle: "Head baker",
        siteId: null,
        weeklyContractHours: null,
        hiredOn: null,
        isActive: false,
      },
    );

    expect(updated).toBe(true);
    await expect(
      scheduleRepository.findEmployee(fixture.organizationId, employeeId),
    ).resolves.toMatchObject({
      jobTitle: "Head baker",
      siteName: null,
      isActive: false,
    });

    await scheduleRepository.updateEmployee(
      fixture.organizationId,
      employeeId,
      {
        memberId: fixture.memberId,
        jobTitle: "Baker",
        siteId: fixture.siteId,
        weeklyContractHours: "35",
        hiredOn: null,
        isActive: true,
      },
    );
  });

  it("adds availability once per weekday and start time", async () => {
    const id = await scheduleRepository.addAvailability(
      fixture.organizationId,
      employeeId,
      {
        weekday: 1,
        startMinute: 8 * 60,
        endMinute: 17 * 60,
        validFrom: null,
        validTo: null,
      },
    );

    await expect(
      scheduleRepository.listAvailability(fixture.organizationId, employeeId),
    ).resolves.toEqual([
      expect.objectContaining({
        id,
        weekday: 1,
        startMinute: 480,
        endMinute: 1020,
      }),
    ]);

    await expect(
      scheduleRepository.addAvailability(fixture.organizationId, employeeId, {
        weekday: 1,
        startMinute: 8 * 60,
        endMinute: 12 * 60,
        validFrom: null,
        validTo: null,
      }),
    ).rejects.toMatchObject({code: "CONFLICT"});

    await expect(
      scheduleRepository.removeAvailability(
        fixture.organizationId,
        employeeId,
        id,
      ),
    ).resolves.toBeUndefined();
    await expect(
      scheduleRepository.removeAvailability(
        fixture.organizationId,
        employeeId,
        id,
      ),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("creates absences and only decides requested ones", async () => {
    const absenceId = await scheduleRepository.createAbsence(
      fixture.organizationId,
      {
        employeeId,
        kind: "VACATION",
        startsAt: new Date("2026-11-03T08:00:00.000Z"),
        endsAt: new Date("2026-11-03T17:00:00.000Z"),
        note: "Family",
      },
    );

    await expect(
      scheduleRepository.findAbsence(fixture.organizationId, absenceId),
    ).resolves.toMatchObject({
      employeeName: "Integration actor",
      status: "REQUESTED",
      note: "Family",
      timeZone: "Europe/Paris",
    });

    await expect(
      scheduleRepository.listAbsences(fixture.organizationId, {
        from: new Date("2026-11-01T00:00:00.000Z"),
        to: new Date("2026-11-30T00:00:00.000Z"),
      }),
    ).resolves.toHaveLength(1);
    await expect(
      scheduleRepository.listAbsences(fixture.organizationId, {
        from: new Date("2026-12-01T00:00:00.000Z"),
        to: new Date("2026-12-31T00:00:00.000Z"),
      }),
    ).resolves.toEqual([]);

    await expect(
      scheduleRepository.decideAbsence(
        fixture.organizationId,
        absenceId,
        "APPROVED",
        fixture.userId,
      ),
    ).resolves.toBeUndefined();
    await expect(
      scheduleRepository.decideAbsence(
        fixture.organizationId,
        absenceId,
        "REJECTED",
        fixture.userId,
      ),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("detects approved absences overlapping a window", async () => {
    const overlapping = await scheduleRepository.approvedAbsencesOverlapping(
      fixture.organizationId,
      employeeId,
      new Date("2026-11-03T12:00:00.000Z"),
      new Date("2026-11-03T13:00:00.000Z"),
    );
    expect(overlapping).toHaveLength(1);

    const outside = await scheduleRepository.approvedAbsencesOverlapping(
      fixture.organizationId,
      employeeId,
      new Date("2026-11-04T12:00:00.000Z"),
      new Date("2026-11-04T13:00:00.000Z"),
    );
    expect(outside).toEqual([]);
  });

  it("creates, lists and removes shifts", async () => {
    shiftId = await scheduleRepository.createShift(fixture.organizationId, {
      siteId: fixture.siteId,
      startsAt: new Date("2026-11-02T08:00:00.000Z"),
      endsAt: new Date("2026-11-02T12:00:00.000Z"),
      kind: "PRODUCTION",
      note: "Morning",
    });

    await expect(
      scheduleRepository.findShift(fixture.organizationId, shiftId),
    ).resolves.toMatchObject({
      siteName: "Atelier",
      timeZone: "Europe/Paris",
      kind: "PRODUCTION",
      assignments: [],
    });

    await expect(
      scheduleRepository.listShifts(fixture.organizationId, {
        from: monday,
        to: new Date("2026-11-09T00:00:00.000Z"),
        siteId: null,
      }),
    ).resolves.toHaveLength(1);
    await expect(
      scheduleRepository.listShifts(fixture.organizationId, {
        from: monday,
        to: new Date("2026-11-09T00:00:00.000Z"),
        siteId: "site_other",
      }),
    ).resolves.toEqual([]);
  });

  it("assigns an employee once and removes the assignment", async () => {
    const assignmentId = await scheduleRepository.addAssignment(
      fixture.organizationId,
      shiftId,
      {employeeId, role: "Oven"},
    );

    const shift = await scheduleRepository.findShift(
      fixture.organizationId,
      shiftId,
    );
    expect(shift?.assignments).toEqual([
      expect.objectContaining({
        id: assignmentId,
        employeeName: "Integration actor",
        role: "Oven",
      }),
    ]);

    await expect(
      scheduleRepository.assignmentsOverlapping(
        fixture.organizationId,
        employeeId,
        new Date("2026-11-02T09:00:00.000Z"),
        new Date("2026-11-02T10:00:00.000Z"),
      ),
    ).resolves.toHaveLength(1);

    await expect(
      scheduleRepository.removeAssignment(
        fixture.organizationId,
        shiftId,
        assignmentId,
      ),
    ).resolves.toBeUndefined();
    await expect(
      scheduleRepository.removeAssignment(
        fixture.organizationId,
        shiftId,
        assignmentId,
      ),
    ).rejects.toMatchObject({code: "NOT_FOUND"});

    await expect(
      scheduleRepository.removeShift(fixture.organizationId, shiftId),
    ).resolves.toBeUndefined();
    await expect(
      scheduleRepository.removeShift(fixture.organizationId, shiftId),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("scopes schedule reads to the tenant", async () => {
    await expect(
      scheduleRepository.listProfiles("org_other"),
    ).resolves.toEqual([]);
    await expect(
      scheduleRepository.findEmployee("org_other", employeeId),
    ).resolves.toBeNull();
    await expect(
      scheduleRepository.listShifts("org_other", {
        from: monday,
        to: new Date("2026-11-09T00:00:00.000Z"),
        siteId: null,
      }),
    ).resolves.toEqual([]);
  });
});
