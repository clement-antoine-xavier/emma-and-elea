import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import type {EventRecord} from "@/lib/dto";
import type {
  EventInput,
  EventRepository,
} from "@/server/repositories/event.repository";
import {isForeignKeyConstraintError} from "@/server/repositories/errors";

export type EventView = {
  events: EventRecord[];
  canWrite: boolean;
};

export interface EventService {
  getEvents(actor: Actor | null): Promise<EventView>;
  createEvent(actor: Actor | null, input: EventInput): Promise<EventRecord>;
  archiveEvent(actor: Actor | null, id: string): Promise<void>;
}

export function createEventService(deps: {
  eventRepository: EventRepository;
}): EventService {
  return {
    async getEvents(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "event:read");

      return {
        events: await deps.eventRepository.list(actor.organizationId),
        canWrite: isGranted(actor, "event:write"),
      };
    },

    async createEvent(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "event:write");

      try {
        return await deps.eventRepository.create(actor.organizationId, input);
      } catch (error) {
        if (isForeignKeyConstraintError(error)) {
          throw new DomainError("NOT_FOUND", undefined, {cause: error});
        }
        throw error;
      }
    },

    async archiveEvent(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "event:write");

      const archived = await deps.eventRepository.archive(
        actor.organizationId,
        id,
      );
      if (!archived) throw new DomainError("NOT_FOUND");
    },
  };
}
