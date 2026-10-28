import {z} from "zod";
import {
  scheduleService,
  teamService,
} from "@/server/services/container";
import {assistantTool, emptyToNull} from "./shared";

const absenceKind = z.enum(["VACATION", "SICK", "TRAINING", "OTHER"]);
const shiftKind = z.enum([
  "PRODUCTION",
  "SALES",
  "DELIVERY",
  "CLEANING",
  "OTHER",
]);

export const teamTools = {
  team: assistantTool({
    name: "get_team",
    description:
      "List team members with their role, plus pending invitations. Read-only.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      teamService.getTeamView(context.actor),
  }),

  employees: assistantTool({
    name: "get_employees",
    description:
      "List employees with their job title, site and contract hours, plus members without a profile.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      scheduleService.getEmployees(context.actor),
  }),

  schedule: assistantTool({
    name: "get_schedule",
    description:
      "Read the shift schedule for a week (Monday, YYYY-MM-DD), optionally for one site.",
    parameters: z.object({
      week: z.string().trim().optional(),
      siteId: z.string().trim().optional(),
    }),
    execute: async (input, context) =>
      scheduleService.getSchedule(context.actor, {
        week: input.week,
        siteId: input.siteId,
      }),
  }),

  absences: assistantTool({
    name: "get_absences",
    description:
      "List absences between two dates, with the employees and the caller's request/decide capabilities.",
    parameters: z.object({
      from: z.string().trim().optional(),
      to: z.string().trim().optional(),
    }),
    execute: async (input, context) =>
      scheduleService.getAbsences(context.actor, {
        from: input.from,
        to: input.to,
      }),
  }),

  createAbsence: assistantTool({
    name: "create_absence",
    description:
      "Record an absence request for an employee. Dates are ISO date-times in the employee's time zone.",
    parameters: z.object({
      employeeId: z.string().trim().min(1),
      kind: absenceKind,
      startsAt: z.string().trim().min(1),
      endsAt: z.string().trim().min(1),
      note: z.string().trim().max(300).optional(),
    }),
    execute: async (input, context) =>
      scheduleService.createAbsence(context.actor, {
        employeeId: input.employeeId,
        kind: input.kind,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        note: emptyToNull(input.note),
      }),
  }),

  decideAbsence: assistantTool({
    name: "decide_absence",
    description:
      "Approve or reject an absence request. This changes the team's planning.",
    parameters: z.object({
      id: z.string().trim().min(1),
      status: z.enum(["APPROVED", "REJECTED"]),
    }),
    needsApproval: true,
    execute: async ({id, status}, context) =>
      scheduleService.decideAbsence(context.actor, id, status),
  }),

  createShift: assistantTool({
    name: "create_shift",
    description:
      "Create a shift for a site. Dates are ISO date-times in the site's time zone.",
    parameters: z.object({
      siteId: z.string().trim().min(1),
      startsAt: z.string().trim().min(1),
      endsAt: z.string().trim().min(1),
      kind: shiftKind,
      note: z.string().trim().max(300).optional(),
    }),
    execute: async (input, context) =>
      scheduleService.createShift(context.actor, {
        siteId: input.siteId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        kind: input.kind,
        note: emptyToNull(input.note),
      }),
  }),

  assignShift: assistantTool({
    name: "assign_shift",
    description: "Assign an employee to a shift, optionally with a role.",
    parameters: z.object({
      shiftId: z.string().trim().min(1),
      employeeId: z.string().trim().min(1),
      role: z.string().trim().max(80).optional(),
    }),
    execute: async (input, context) =>
      scheduleService.assignEmployee(
        context.actor,
        input.shiftId,
        input.employeeId,
        emptyToNull(input.role),
      ),
  }),
};
