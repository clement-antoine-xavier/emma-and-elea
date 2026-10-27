"use server";

import {getActorContext} from "@/server/auth/actor";
import {scheduleService} from "@/server/services/container";
import {
  absenceIdSchema,
  absenceInputSchema,
  assignmentIdSchema,
  assignmentInputSchema,
  availabilityIdSchema,
  availabilityInputSchema,
  employeeIdSchema,
  employeeInputSchema,
  shiftIdSchema,
  shiftInputSchema,
} from "@/server/validators/schedule.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type ScheduleActionResult =
  | ({ok: true} & {employeeId?: string; shiftId?: string})
  | {ok: false; error: ActionErrorKey};

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function createEmployeeAction(
  input: unknown,
): Promise<ScheduleActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = employeeInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {id} = await scheduleService.createEmployee(actor, {
      memberId: parsed.data.memberId,
      jobTitle: parsed.data.jobTitle || null,
      siteId: parsed.data.siteId || null,
      weeklyContractHours: parsed.data.weeklyContractHours || null,
      hiredOn: parsed.data.hiredOn
        ? new Date(`${parsed.data.hiredOn}T00:00:00.000Z`)
        : null,
      isActive: parsed.data.isActive,
    });
    return {ok: true, employeeId: id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function updateEmployeeAction(
  id: unknown,
  input: unknown,
): Promise<ScheduleActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = employeeIdSchema.safeParse({id});
  const parsed = employeeInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await scheduleService.updateEmployee(actor, parsedId.data.id, {
      memberId: parsed.data.memberId,
      jobTitle: parsed.data.jobTitle || null,
      siteId: parsed.data.siteId || null,
      weeklyContractHours: parsed.data.weeklyContractHours || null,
      hiredOn: parsed.data.hiredOn
        ? new Date(`${parsed.data.hiredOn}T00:00:00.000Z`)
        : null,
      isActive: parsed.data.isActive,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function addAvailabilityAction(
  employeeId: unknown,
  input: unknown,
): Promise<ScheduleActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = employeeIdSchema.safeParse({id: employeeId});
  const parsed = availabilityInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await scheduleService.addAvailability(actor, parsedId.data.id, {
      weekday: Number(parsed.data.weekday),
      startMinute: timeToMinutes(parsed.data.startTime),
      endMinute: timeToMinutes(parsed.data.endTime),
      validFrom: parsed.data.validFrom
        ? new Date(`${parsed.data.validFrom}T00:00:00.000Z`)
        : null,
      validTo: parsed.data.validTo
        ? new Date(`${parsed.data.validTo}T00:00:00.000Z`)
        : null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removeAvailabilityAction(
  input: unknown,
): Promise<ScheduleActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = availabilityIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await scheduleService.removeAvailability(
      actor,
      parsed.data.employeeId,
      parsed.data.availabilityId,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function createAbsenceAction(
  input: unknown,
): Promise<ScheduleActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = absenceInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await scheduleService.createAbsence(actor, {
      employeeId: parsed.data.employeeId,
      kind: parsed.data.kind as "VACATION" | "SICK" | "TRAINING" | "OTHER",
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      note: parsed.data.note || null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function decideAbsenceAction(
  id: unknown,
  status: "APPROVED" | "REJECTED",
): Promise<ScheduleActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = absenceIdSchema.safeParse({id});
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await scheduleService.decideAbsence(actor, parsed.data.id, status);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function createShiftAction(
  input: unknown,
): Promise<ScheduleActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = shiftInputSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    const {id} = await scheduleService.createShift(actor, {
      siteId: parsed.data.siteId,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      kind: parsed.data.kind as
        | "PRODUCTION"
        | "SALES"
        | "DELIVERY"
        | "CLEANING"
        | "OTHER",
      note: parsed.data.note || null,
    });
    return {ok: true, shiftId: id};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removeShiftAction(
  input: unknown,
): Promise<ScheduleActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = shiftIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await scheduleService.removeShift(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function assignEmployeeAction(
  shiftId: unknown,
  input: unknown,
): Promise<ScheduleActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = shiftIdSchema.safeParse({id: shiftId});
  const parsed = assignmentInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await scheduleService.assignEmployee(
      actor,
      parsedId.data.id,
      parsed.data.employeeId,
      parsed.data.role || null,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removeAssignmentAction(
  input: unknown,
): Promise<ScheduleActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = assignmentIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await scheduleService.removeAssignment(
      actor,
      parsed.data.shiftId,
      parsed.data.assignmentId,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
