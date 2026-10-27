import {
  absenceIdSchema,
  absenceInputSchema,
  assignmentIdSchema,
  assignmentInputSchema,
  availabilityIdSchema,
  availabilityInputSchema,
  employeeIdSchema,
  employeeInputSchema,
  employeeMemberIdSchema,
  shiftIdSchema,
  shiftInputSchema,
} from "@/server/validators/schedule.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const t = (key: string) => key;
const employee = employeeInputSchema(t);
const availability = availabilityInputSchema(t);
const absence = absenceInputSchema(t);
const shift = shiftInputSchema(t);
const assignment = assignmentInputSchema(t);

describe("employeeInputSchema", () => {
  function validEmployee(overrides: Record<string, unknown> = {}) {
    return {
      memberId: "member_1",
      jobTitle: "",
      siteId: "",
      weeklyContractHours: "",
      hiredOn: "",
      isActive: true,
      ...overrides,
    };
  }

  it("accepts a minimal employee profile", () => {
    expectValid(employee, validEmployee());
  });

  it("accepts contract details", () => {
    expectValid(
      employee,
      validEmployee({
        weeklyContractHours: "35",
        hiredOn: "2026-01-15",
        jobTitle: "Head baker",
        siteId: "site_1",
        isActive: false,
      }),
    );
  });

  it.each([
    [{memberId: ""}, "memberRequired"],
    [{jobTitle: "x".repeat(81)}, "jobTitleTooLong"],
    [{weeklyContractHours: "-1"}, "hoursInvalid"],
    [{weeklyContractHours: "168.01"}, "hoursInvalid"],
    [{weeklyContractHours: "1.234"}, "hoursInvalid"],
    [{hiredOn: "2026-02-30"}, "dateInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(employee, validEmployee(overrides), message);
  });
});

describe("availabilityInputSchema", () => {
  function validAvailability(overrides: Record<string, unknown> = {}) {
    return {
      employeeId: "employee_1",
      weekday: "1",
      startTime: "08:00",
      endTime: "12:00",
      validFrom: "",
      validTo: "",
      ...overrides,
    };
  }

  it("accepts a weekly window and a validity range", () => {
    expectValid(availability, validAvailability());
    expectValid(
      availability,
      validAvailability({validFrom: "2026-01-01", validTo: "2026-12-31"}),
    );
  });

  it.each([
    [{employeeId: ""}, "employeeRequired"],
    [{weekday: "7"}, "weekdayInvalid"],
    [{weekday: "-1"}, "weekdayInvalid"],
    [{weekday: "abc"}, "weekdayInvalid"],
    [{startTime: "8:00"}, "timeInvalid"],
    [{startTime: "24:00"}, "timeInvalid"],
    [{endTime: "12:60"}, "timeInvalid"],
    [{endTime: "08:00"}, "endAfterStart"],
    [{endTime: "07:59"}, "endAfterStart"],
    [{validFrom: "2026-12-31", validTo: "2026-01-01"}, "dateOrderInvalid"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(availability, validAvailability(overrides), message);
  });
});

describe("absenceInputSchema", () => {
  function validAbsence(overrides: Record<string, unknown> = {}) {
    return {
      employeeId: "employee_1",
      kind: "VACATION",
      startsAt: "2026-10-27T08:00",
      endsAt: "2026-10-27T17:00",
      note: "",
      ...overrides,
    };
  }

  it("accepts each absence kind", () => {
    for (const kind of ["VACATION", "SICK", "TRAINING", "OTHER"]) {
      expectValid(absence, validAbsence({kind}));
    }
  });

  it.each([
    [{employeeId: ""}, "employeeRequired"],
    [{kind: "HOLIDAY"}, "kindInvalid"],
    [{startsAt: "2026-10-27"}, "dateInvalid"],
    [{endsAt: "2026-10-27T08:00"}, "endAfterStart"],
    [{endsAt: "2026-10-27T07:59"}, "endAfterStart"],
    [{note: "x".repeat(301)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(absence, validAbsence(overrides), message);
  });
});

describe("shiftInputSchema", () => {
  function validShift(overrides: Record<string, unknown> = {}) {
    return {
      siteId: "site_1",
      startsAt: "2026-10-27T06:00",
      endsAt: "2026-10-27T14:00",
      kind: "PRODUCTION",
      note: "",
      ...overrides,
    };
  }

  it("accepts a shift", () => {
    expectValid(shift, validShift());
  });

  it.each([
    [{siteId: ""}, "siteRequired"],
    [{kind: "NIGHT"}, "kindInvalid"],
    [{endsAt: "2026-10-27T05:59"}, "endAfterStart"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(shift, validShift(overrides), message);
  });
});

describe("assignmentInputSchema", () => {
  it("requires a shift and an employee", () => {
    expectValid(assignment, {
      shiftId: "shift_1",
      employeeId: "employee_1",
      role: "Oven",
    });
    expectInvalid(assignment, {
      shiftId: "",
      employeeId: "employee_1",
      role: "",
    }, "shiftRequired");
    expectInvalid(assignment, {
      shiftId: "shift_1",
      employeeId: "",
      role: "",
    }, "employeeRequired");
    expectInvalid(assignment, {
      shiftId: "shift_1",
      employeeId: "employee_1",
      role: "x".repeat(61),
    }, "roleTooLong");
  });
});

describe("schedule id schemas", () => {
  it("reject blank ids", () => {
    expectInvalid(employeeIdSchema, {id: ""});
    expectInvalid(employeeMemberIdSchema, {employeeId: ""});
    expectInvalid(availabilityIdSchema, {employeeId: "", availabilityId: "a"});
    expectInvalid(absenceIdSchema, {id: ""});
    expectInvalid(shiftIdSchema, {id: " "});
    expectInvalid(assignmentIdSchema, {shiftId: "s", assignmentId: ""});
  });
});
