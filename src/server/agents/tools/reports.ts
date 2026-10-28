import {z} from "zod";
import {
  dashboardService,
  reportService,
} from "@/server/services/container";
import {assistantTool} from "./shared";

export const reportTools = {
  reports: assistantTool({
    name: "get_reports",
    description:
      "Thirty-day report pack: product margins, batch yields, sales summary and stock alerts. Requires finance access.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      reportService.getReports(context.actor),
  }),

  kpis: assistantTool({
    name: "get_dashboard_kpis",
    description:
      "Dashboard KPIs for the organization. Requires finance access.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      reportService.getKpis(context.actor),
  }),

  overview: assistantTool({
    name: "get_dashboard_overview",
    description:
      "Which dashboard areas the caller can view or manage, based on the member role.",
    parameters: z.object({}),
    execute: async (_input, context) =>
      dashboardService.getOverview(context.actor),
  }),
};
