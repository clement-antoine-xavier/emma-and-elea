import {getActorContext} from "@/server/auth/actor";
import {scheduleService} from "@/server/services/container";
import {
  addAvailabilityAction,
  assignEmployeeAction,
  createAbsenceAction,
  createEmployeeAction,
  createShiftAction,
  decideAbsenceAction,
  removeAssignmentAction,
  removeAvailabilityAction,
  removeShiftAction,
  updateEmployeeAction,
} from "@/app/actions/schedule.actions";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";

jest.mock("@/server/auth/actor", () => ({getActorContext: jest.fn()}));
jest.mock("@/server/services/container", () => ({
  scheduleService: {
    createEmployee: jest.fn(),
    updateEmployee: jest.fn(),
    addAvailability: jest.fn(),
    removeAvailability: jest.fn(),
    createAbsence: jest.fn(),
    decideAbsence: jest.fn(),
    createShift: jest.fn(),
    removeShift: jest.fn(),
    assignEmployee: jest.fn(),
    removeAssignment: jest.fn(),
  },
}));

const getActor = getActorContext as jest.Mock;
const schedule = scheduleService as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  getActor.mockResolvedValue(actorFor("production_manager"));
});

describe("employee actions", () => {
  const input = {
    memberId: "member_1",
    jobTitle: "",
    siteId: "",
    weeklyContractHours: "",
    hiredOn: "",
    isActive: true,
  };

  it("nulls the optional contract fields", async () => {
    schedule.createEmployee.mockResolvedValue({id: "employee_1"});

    await expect(createEmployeeAction(input)).resolves.toEqual({
      ok: true,
      employeeId: "employee_1",
    });
    expect(schedule.createEmployee).toHaveBeenCalledWith(expect.any(Object), {
      memberId: "member_1",
      jobTitle: null,
      siteId: null,
      weeklyContractHours: null,
      hiredOn: null,
      isActive: true,
    });
  });

  it("keeps a hired-on date and a contract", async () => {
    schedule.createEmployee.mockResolvedValue({id: "employee_1"});

    await createEmployeeAction({
      ...input,
      jobTitle: "Baker",
      siteId: "site_1",
      weeklyContractHours: "35",
      hiredOn: "2026-01-15",
    });

    expect(schedule.createEmployee).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        jobTitle: "Baker",
        siteId: "site_1",
        weeklyContractHours: "35",
        hiredOn: new Date("2026-01-15T00:00:00.000Z"),
      }),
    );
  });

  it("validates the id on update and maps a forbidden edit", async () => {
    await expect(updateEmployeeAction("", input)).resolves.toEqual({
      ok: false,
      error: "invalidInput",
    });

    schedule.updateEmployee.mockRejectedValue(new DomainError("FORBIDDEN"));
    await expect(
      updateEmployeeAction("employee_1", input),
    ).resolves.toEqual({ok: false, error: "forbidden"});
  });
});

describe("availability actions", () => {
  it("converts times to minutes and nulls optional dates", async () => {
    schedule.addAvailability.mockResolvedValue(undefined);

    await expect(
      addAvailabilityAction("employee_1", {
        employeeId: "employee_1",
        weekday: "1",
        startTime: "08:30",
        endTime: "12:00",
        validFrom: "",
        validTo: "",
      }),
    ).resolves.toEqual({ok: true});
    expect(schedule.addAvailability).toHaveBeenCalledWith(
      expect.any(Object),
      "employee_1",
      {
        weekday: 1,
        startMinute: 510,
        endMinute: 720,
        validFrom: null,
        validTo: null,
      },
    );
  });

  it("keeps validity dates", async () => {
    schedule.addAvailability.mockResolvedValue(undefined);

    await addAvailabilityAction("employee_1", {
      employeeId: "employee_1",
      weekday: "0",
      startTime: "00:00",
      endTime: "23:59",
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
    });

    expect(schedule.addAvailability).toHaveBeenCalledWith(
      expect.any(Object),
      "employee_1",
      expect.objectContaining({
        weekday: 0,
        startMinute: 0,
        endMinute: 1439,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: new Date("2026-12-31T00:00:00.000Z"),
      }),
    );
  });

  it("rejects an inverted window", async () => {
    await expect(
      addAvailabilityAction("employee_1", {
        employeeId: "employee_1",
        weekday: "1",
        startTime: "12:00",
        endTime: "08:00",
        validFrom: "",
        validTo: "",
      }),
    ).resolves.toEqual({ok: false, error: "invalidInput"});
  });

  it("removes availability", async () => {
    schedule.removeAvailability.mockResolvedValue(undefined);

    await expect(
      removeAvailabilityAction({
        employeeId: "employee_1",
        availabilityId: "availability_1",
      }),
    ).resolves.toEqual({ok: true});
  });
});

describe("absence and shift actions", () => {
  it("creates an absence with wall-clock instants", async () => {
    schedule.createAbsence.mockResolvedValue(undefined);

    await expect(
      createAbsenceAction({
        employeeId: "employee_1",
        kind: "VACATION",
        startsAt: "2026-10-27T08:00",
        endsAt: "2026-10-27T17:00",
        note: "",
      }),
    ).resolves.toEqual({ok: true});
    expect(schedule.createAbsence).toHaveBeenCalledWith(expect.any(Object), {
      employeeId: "employee_1",
      kind: "VACATION",
      startsAt: "2026-10-27T08:00",
      endsAt: "2026-10-27T17:00",
      note: null,
    });
  });

  it("decides an absence", async () => {
    schedule.decideAbsence.mockResolvedValue(undefined);

    await expect(
      decideAbsenceAction("absence_1", "APPROVED"),
    ).resolves.toEqual({ok: true});
    expect(schedule.decideAbsence).toHaveBeenCalledWith(
      expect.any(Object),
      "absence_1",
      "APPROVED",
    );
  });

  it("creates and removes a shift", async () => {
    schedule.createShift.mockResolvedValue({id: "shift_1"});
    schedule.removeShift.mockResolvedValue(undefined);

    await expect(
      createShiftAction({
        siteId: "site_1",
        startsAt: "2026-10-27T06:00",
        endsAt: "2026-10-27T14:00",
        kind: "PRODUCTION",
        note: "",
      }),
    ).resolves.toEqual({ok: true, shiftId: "shift_1"});
    await expect(removeShiftAction({id: "shift_1"})).resolves.toEqual({
      ok: true,
    });
  });

  it("maps a shift conflict", async () => {
    schedule.createShift.mockRejectedValue(new DomainError("SHIFT_CONFLICT"));

    await expect(
      createShiftAction({
        siteId: "site_1",
        startsAt: "2026-10-27T06:00",
        endsAt: "2026-10-27T14:00",
        kind: "PRODUCTION",
        note: "",
      }),
    ).resolves.toEqual({ok: false, error: "conflict"});
  });
});

describe("assignment actions", () => {
  it("assigns an employee with a null role", async () => {
    schedule.assignEmployee.mockResolvedValue(undefined);

    await expect(
      assignEmployeeAction("shift_1", {
        shiftId: "shift_1",
        employeeId: "employee_1",
        role: "",
      }),
    ).resolves.toEqual({ok: true});
    expect(schedule.assignEmployee).toHaveBeenCalledWith(
      expect.any(Object),
      "shift_1",
      "employee_1",
      null,
    );
  });

  it("rejects an unavailable employee", async () => {
    schedule.assignEmployee.mockRejectedValue(
      new DomainError("EMPLOYEE_UNAVAILABLE"),
    );

    await expect(
      assignEmployeeAction("shift_1", {
        shiftId: "shift_1",
        employeeId: "employee_1",
        role: "Oven",
      }),
    ).resolves.toEqual({ok: false, error: "invalidState"});
  });

  it("removes an assignment", async () => {
    schedule.removeAssignment.mockResolvedValue(undefined);

    await expect(
      removeAssignmentAction({
        shiftId: "shift_1",
        assignmentId: "assignment_1",
      }),
    ).resolves.toEqual({ok: true});
  });
});
