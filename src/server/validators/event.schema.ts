import {z} from "zod";

export const EVENT_KINDS = [
  "LOCAL_EVENT",
  "HOLIDAY",
  "SCHOOL_BREAK",
  "WEATHER",
  "OTHER",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export const eventValidationKeys = [
  "nameRequired",
  "nameTooLong",
  "kindInvalid",
  "dateInvalid",
  "datesInvalid",
  "upliftInvalid",
  "noteTooLong",
] as const;

export type EventValidationKey = (typeof eventValidationKeys)[number];

export type TranslateEventValidation = (key: EventValidationKey) => string;

const isoDay = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), message);

export function createEventSchema(t: TranslateEventValidation) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, t("nameRequired"))
        .max(120, t("nameTooLong")),
      kind: z
        .string()
        .refine(
          (value) => (EVENT_KINDS as readonly string[]).includes(value),
          t("kindInvalid"),
        ),
      siteId: z.string().trim(),
      startsOn: isoDay(t("dateInvalid")),
      endsOn: isoDay(t("dateInvalid")),
      expectedUpliftPct: z
        .string()
        .trim()
        .refine(
          (value) =>
            value === "" ||
            (/^-?\d+(?:\.\d{1,2})?$/.test(value) &&
              Number(value) >= -100 &&
              Number(value) <= 200),
          t("upliftInvalid"),
        ),
      note: z.string().trim().max(500, t("noteTooLong")),
    })
    .refine((values) => values.endsOn >= values.startsOn, {
      message: t("datesInvalid"),
      path: ["endsOn"],
    });
}

export type CreateEventValues = z.infer<
  ReturnType<typeof createEventSchema>
>;

export const eventIdSchema = z.object({
  id: z.string().trim().min(1),
});
