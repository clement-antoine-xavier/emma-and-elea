import {prisma} from "@/lib/prisma";
import type {EventRecord} from "@/lib/dto";
import type {EventKind} from "@/server/validators/event.schema";

export type EventInput = {
  name: string;
  kind: EventKind;
  siteId: string | null;
  startsOn: Date;
  endsOn: Date;
  expectedUpliftPct: string | null;
  note: string | null;
};

const eventSelect = {
  id: true,
  siteId: true,
  site: {select: {name: true}},
  name: true,
  kind: true,
  startsOn: true,
  endsOn: true,
  expectedUpliftPct: true,
  note: true,
  archivedAt: true,
} as const;

type SelectedEvent = {
  id: string;
  siteId: string | null;
  site: {name: string} | null;
  name: string;
  kind: string;
  startsOn: Date;
  endsOn: Date;
  expectedUpliftPct: {toString(): string} | null;
  note: string | null;
  archivedAt: Date | null;
};

function toRecord(row: SelectedEvent): EventRecord {
  return {
    id: row.id,
    siteId: row.siteId,
    siteName: row.site?.name ?? null,
    name: row.name,
    kind: row.kind as EventRecord["kind"],
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    expectedUpliftPct: row.expectedUpliftPct?.toString() ?? null,
    note: row.note,
    archivedAt: row.archivedAt,
  };
}

export interface EventRepository {
  list(organizationId: string): Promise<EventRecord[]>;
  create(organizationId: string, input: EventInput): Promise<EventRecord>;
  archive(organizationId: string, id: string): Promise<boolean>;
}

export const eventRepository: EventRepository = {
  async list(organizationId) {
    const events = await prisma.event.findMany({
      where: {organizationId},
      orderBy: [{archivedAt: "asc"}, {startsOn: "desc"}],
      select: eventSelect,
    });

    return events.map(toRecord);
  },

  async create(organizationId, input) {
    const event = await prisma.event.create({
      data: {organizationId, ...input},
      select: eventSelect,
    });

    return toRecord(event);
  },

  async archive(organizationId, id) {
    const result = await prisma.event.updateMany({
      where: {id, organizationId, archivedAt: null},
      data: {archivedAt: new Date()},
    });

    return result.count > 0;
  },
};
