"use server";

import {getActorContext} from "@/server/auth/actor";
import {eventService} from "@/server/services/container";
import {
  createEventSchema,
  eventIdSchema,
  type EventKind,
} from "@/server/validators/event.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type EventActionResult =
  | {ok: true}
  | {ok: false; error: ActionErrorKey};

function calendarDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function createEventAction(
  input: unknown,
): Promise<EventActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = createEventSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await eventService.createEvent(actor, {
      name: parsed.data.name,
      kind: parsed.data.kind as EventKind,
      siteId: parsed.data.siteId ? parsed.data.siteId : null,
      startsOn: calendarDay(parsed.data.startsOn),
      endsOn: calendarDay(parsed.data.endsOn),
      expectedUpliftPct:
        parsed.data.expectedUpliftPct === ""
          ? null
          : parsed.data.expectedUpliftPct,
      note: parsed.data.note || null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function archiveEventAction(
  input: unknown,
): Promise<EventActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await eventService.archiveEvent(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
