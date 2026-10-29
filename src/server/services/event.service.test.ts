import {createEventService} from "@/server/services/event.service";
import type {EventRepository} from "@/server/repositories/event.repository";
import type {EventRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";

const event: EventRecord = {
  id: "event_1",
  siteId: "site_1",
  siteName: "Shop",
  name: "School break",
  kind: "SCHOOL_BREAK",
  startsOn: new Date("2026-02-09T00:00:00.000Z"),
  endsOn: new Date("2026-02-20T00:00:00.000Z"),
  expectedUpliftPct: "15",
  note: null,
  archivedAt: null,
};

const input = {
  name: "School break",
  kind: "SCHOOL_BREAK" as const,
  siteId: "site_1",
  startsOn: new Date("2026-02-09T00:00:00.000Z"),
  endsOn: new Date("2026-02-20T00:00:00.000Z"),
  expectedUpliftPct: "15",
  note: null,
};

function repository(
  overrides: Partial<EventRepository> = {},
): EventRepository {
  return {
    list: jest.fn().mockResolvedValue([event]),
    create: jest.fn().mockResolvedValue(event),
    archive: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("event service", () => {
  it("requires a signed-in member", async () => {
    const service = createEventService({eventRepository: repository()});

    await expect(service.getEvents(null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lists events with a write flag", async () => {
    const service = createEventService({eventRepository: repository()});

    await expect(
      service.getEvents(actorFor("production_manager")),
    ).resolves.toEqual({events: [event], canWrite: true});

    await expect(service.getEvents(actorFor("staff"))).resolves.toMatchObject({
      canWrite: false,
    });
  });

  it("lets sales and production managers write events", async () => {
    const repo = repository();
    const service = createEventService({eventRepository: repo});

    await expect(
      service.createEvent(actorFor("sales"), input),
    ).resolves.toEqual(event);
    expect(repo.create).toHaveBeenCalledWith("org_1", input);

    await expect(
      service.createEvent(actorFor("stock_manager"), input),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("archives an event and maps a missing row", async () => {
    const repo = repository({archive: jest.fn().mockResolvedValue(false)});
    const service = createEventService({eventRepository: repo});

    await expect(
      service.archiveEvent(actorFor("production_manager"), "event_1"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });
});
