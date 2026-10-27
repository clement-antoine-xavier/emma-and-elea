import {z} from "zod";
import {
  isoDateTimeString,
  optionalDecimalString,
  optionalIsoDateString,
} from "./shared";

export const ABSENCE_KINDS = ["VACATION", "SICK", "TRAINING", "OTHER"] as const;
export const SHIFT_KINDS = [
  "PRODUCTION",
  "SALES",
  "DELIVERY",
  "CLEANING",
  "OTHER",
] as const;
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export const scheduleValidationKeys = [
  "memberRequired",
  "employeeRequired",
  "siteRequired",
  "jobTitleTooLong",
  "hoursInvalid",
  "dateInvalid",
  "weekdayInvalid",
  "timeInvalid",
  "endAfterStart",
  "dateOrderInvalid",
  "kindInvalid",
  "noteTooLong",
  "roleTooLong",
  "shiftRequired",
] as const;

export type ScheduleValidationKey = (typeof scheduleValidationKeys)[number];

export type TranslateScheduleValidation = (
  key: ScheduleValidationKey,
) => string;

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeString(message: string) {
  return z.string().trim().refine((value) => timePattern.test(value), message);
}

export function employeeInputSchema(t: TranslateScheduleValidation) {
  return z.object({
    memberId: z.string().trim().min(1, t("memberRequired")),
    jobTitle: z.string().trim().max(80, t("jobTitleTooLong")),
    siteId: z.string().trim(),
    weeklyContractHours: optionalDecimalString({
      message: t("hoursInvalid"),
      min: 0,
      max: 168,
      scale: 2,
    }),
    hiredOn: optionalIsoDateString(t("dateInvalid")),
    isActive: z.boolean(),
  });
}

export type EmployeeInputValues = z.infer<
  ReturnType<typeof employeeInputSchema>
>;

export function availabilityInputSchema(t: TranslateScheduleValidation) {
  return z
    .object({
      employeeId: z.string().trim().min(1, t("employeeRequired")),
      weekday: z.string().refine(
        (value) => WEEKDAYS.includes(Number(value) as (typeof WEEKDAYS)[number]),
        t("weekdayInvalid"),
      ),
      startTime: timeString(t("timeInvalid")),
      endTime: timeString(t("timeInvalid")),
      validFrom: optionalIsoDateString(t("dateInvalid")),
      validTo: optionalIsoDateString(t("dateInvalid")),
    })
    .refine(
      (value) => value.endTime > value.startTime,
      {message: t("endAfterStart"), path: ["endTime"]},
    )
    .refine(
      (value) =>
        !value.validFrom ||
        !value.validTo ||
        value.validFrom <= value.validTo,
      {message: t("dateOrderInvalid"), path: ["validTo"]},
    );
}

export type AvailabilityInputValues = z.infer<
  ReturnType<typeof availabilityInputSchema>
>;

export function absenceInputSchema(t: TranslateScheduleValidation) {
  return z
    .object({
      employeeId: z.string().trim().min(1, t("employeeRequired")),
      kind: z.string().refine(
        (value) => (ABSENCE_KINDS as readonly string[]).includes(value),
        t("kindInvalid"),
      ),
      startsAt: isoDateTimeString(t("dateInvalid")),
      endsAt: isoDateTimeString(t("dateInvalid")),
      note: z.string().trim().max(300, t("noteTooLong")),
    })
    .refine(
      (value) => value.endsAt > value.startsAt,
      {message: t("endAfterStart"), path: ["endsAt"]},
    );
}

export type AbsenceInputValues = z.infer<
  ReturnType<typeof absenceInputSchema>
>;

export function shiftInputSchema(t: TranslateScheduleValidation) {
  return z
    .object({
      siteId: z.string().trim().min(1, t("siteRequired")),
      startsAt: isoDateTimeString(t("dateInvalid")),
      endsAt: isoDateTimeString(t("dateInvalid")),
      kind: z.string().refine(
        (value) => (SHIFT_KINDS as readonly string[]).includes(value),
        t("kindInvalid"),
      ),
      note: z.string().trim().max(300, t("noteTooLong")),
    })
    .refine(
      (value) => value.endsAt > value.startsAt,
      {message: t("endAfterStart"), path: ["endsAt"]},
    );
}

export type ShiftInputValues = z.infer<ReturnType<typeof shiftInputSchema>>;

export function assignmentInputSchema(t: TranslateScheduleValidation) {
  return z.object({
    shiftId: z.string().trim().min(1, t("shiftRequired")),
    employeeId: z.string().trim().min(1, t("employeeRequired")),
    role: z.string().trim().max(60, t("roleTooLong")),
  });
}

export type AssignmentInputValues = z.infer<
  ReturnType<typeof assignmentInputSchema>
>;

export const employeeIdSchema = z.object({id: z.string().trim().min(1)});
export const employeeMemberIdSchema = z.object({
  employeeId: z.string().trim().min(1),
});
export const availabilityIdSchema = z.object({
  employeeId: z.string().trim().min(1),
  availabilityId: z.string().trim().min(1),
});
export const absenceIdSchema = z.object({id: z.string().trim().min(1)});
export const shiftIdSchema = z.object({id: z.string().trim().min(1)});
export const assignmentIdSchema = z.object({
  shiftId: z.string().trim().min(1),
  assignmentId: z.string().trim().min(1),
});
