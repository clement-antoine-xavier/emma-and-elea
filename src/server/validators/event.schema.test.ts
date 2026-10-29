import {
  createEventSchema,
  eventIdSchema,
  EVENT_KINDS,
} from "@/server/validators/event.schema";
import {expectInvalid, expectValid} from "@/test-utils/assertions";

const schema = createEventSchema((key) => key);

function validEvent(overrides: Record<string, unknown> = {}) {
  return {
    name: "School break",
    kind: "SCHOOL_BREAK",
    siteId: "",
    startsOn: "2026-02-09",
    endsOn: "2026-02-20",
    expectedUpliftPct: "15",
    note: "",
    ...overrides,
  };
}

describe("createEventSchema", () => {
  it("accepts every event kind", () => {
    for (const kind of EVENT_KINDS) {
      expectValid(schema, validEvent({kind}));
    }
  });

  it("accepts an empty uplift and the bounds", () => {
    for (const expectedUpliftPct of ["", "-100", "0", "200", "12.5"]) {
      expectValid(schema, validEvent({expectedUpliftPct}));
    }
  });

  it("accepts a single-day event", () => {
    expectValid(
      schema,
      validEvent({startsOn: "2026-02-09", endsOn: "2026-02-09"}),
    );
  });

  it.each([
    [{name: "A"}, "nameRequired"],
    [{name: "x".repeat(121)}, "nameTooLong"],
    [{kind: "TOURIST" }, "kindInvalid"],
    [{startsOn: "09/02/2026"}, "dateInvalid"],
    [{endsOn: ""}, "dateInvalid"],
    [{startsOn: "2026-02-21"}, "datesInvalid"],
    [{expectedUpliftPct: "-101"}, "upliftInvalid"],
    [{expectedUpliftPct: "201"}, "upliftInvalid"],
    [{expectedUpliftPct: "12.345"}, "upliftInvalid"],
    [{note: "x".repeat(501)}, "noteTooLong"],
  ])("rejects %p", (overrides, message) => {
    expectInvalid(schema, validEvent(overrides), message);
  });

  it("rejects a blank id", () => {
    expectInvalid(eventIdSchema, {id: ""});
  });
});
