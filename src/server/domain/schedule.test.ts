import {
  availabilityCovers,
  shiftHours,
  shiftsOverlap,
  startOfWeek,
  zonedDateTimeToUtc,
  zonedParts,
} from "./schedule";

describe("schedule domain", () => {
  it("converts a Paris summer wall clock to UTC and back", () => {
    const instant = zonedDateTimeToUtc(
      "2026-07-01T09:00",
      "Europe/Paris",
    );

    expect(instant.toISOString()).toBe("2026-07-01T07:00:00.000Z");
    expect(zonedParts(instant, "Europe/Paris")).toEqual({
      weekday: 2,
      minutes: 9 * 60,
      dateKey: "2026-07-01",
    });
  });

  it("uses the winter offset after the DST change", () => {
    const instant = zonedDateTimeToUtc(
      "2026-12-01T09:00",
      "Europe/Paris",
    );

    expect(instant.toISOString()).toBe("2026-12-01T08:00:00.000Z");
  });

  it("requires the shift to fit inside one availability window", () => {
    const windows = [
      {
        weekday: 0,
        startMinute: 8 * 60,
        endMinute: 12 * 60,
        validFrom: null,
        validTo: null,
      },
      {
        weekday: 0,
        startMinute: 14 * 60,
        endMinute: 18 * 60,
        validFrom: null,
        validTo: null,
      },
    ];

    expect(
      availabilityCovers(windows, {
        weekday: 0,
        startMinute: 9 * 60,
        endMinute: 11 * 60,
        dateKey: "2026-11-02",
      }),
    ).toBe(true);
    expect(
      availabilityCovers(windows, {
        weekday: 0,
        startMinute: 11 * 60,
        endMinute: 15 * 60,
        dateKey: "2026-11-02",
      }),
    ).toBe(false);
    expect(
      availabilityCovers(windows, {
        weekday: 1,
        startMinute: 9 * 60,
        endMinute: 11 * 60,
        dateKey: "2026-11-03",
      }),
    ).toBe(false);
  });

  it("treats an employee with no windows as flexible", () => {
    expect(
      availabilityCovers([], {
        weekday: 3,
        startMinute: 0,
        endMinute: 60,
        dateKey: "2026-11-05",
      }),
    ).toBe(true);
  });

  it("honours availability validity dates", () => {
    const windows = [
      {
        weekday: 0,
        startMinute: 8 * 60,
        endMinute: 18 * 60,
        validFrom: new Date("2026-11-01T00:00:00.000Z"),
        validTo: new Date("2026-11-30T00:00:00.000Z"),
      },
    ];

    expect(
      availabilityCovers(windows, {
        weekday: 0,
        startMinute: 9 * 60,
        endMinute: 10 * 60,
        dateKey: "2026-10-26",
      }),
    ).toBe(false);
    expect(
      availabilityCovers(windows, {
        weekday: 0,
        startMinute: 9 * 60,
        endMinute: 10 * 60,
        dateKey: "2026-11-02",
      }),
    ).toBe(true);
  });

  it("detects overlapping shifts", () => {
    const base = new Date("2026-11-02T08:00:00.000Z");

    expect(
      shiftsOverlap(
        {startsAt: base, endsAt: new Date("2026-11-02T12:00:00.000Z")},
        {
          startsAt: new Date("2026-11-02T11:00:00.000Z"),
          endsAt: new Date("2026-11-02T14:00:00.000Z"),
        },
      ),
    ).toBe(true);
    expect(
      shiftsOverlap(
        {startsAt: base, endsAt: new Date("2026-11-02T12:00:00.000Z")},
        {
          startsAt: new Date("2026-11-02T12:00:00.000Z"),
          endsAt: new Date("2026-11-02T14:00:00.000Z"),
        },
      ),
    ).toBe(false);
  });

  it("computes Monday week starts and decimal hours", () => {
    expect(
      startOfWeek(new Date("2026-11-04T15:00:00.000Z")).toISOString(),
    ).toBe("2026-11-02T00:00:00.000Z");
    expect(
      shiftHours(
        new Date("2026-11-02T08:00:00.000Z"),
        new Date("2026-11-02T12:30:00.000Z"),
      ).toString(),
    ).toBe("4.5");
  });
});
