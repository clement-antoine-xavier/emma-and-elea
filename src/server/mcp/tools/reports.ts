import type {McpServer} from "@modelcontextprotocol/server";
import type {OrganizationActor} from "@/server/auth/types";
import {runTool} from "../result";
import {financeScope, readScope, type McpDeps} from "./shared";

export function registerReportTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "get_reports",
    {
      description:
        "Thirty-day report pack: product margins, batch yields, sales summary and stock alerts. Requires the finance scope.",
      scopeChallenge: financeScope,
    },
    async () => runTool(() => deps.report.getReports(actor)),
  );

  server.registerTool(
    "get_dashboard_kpis",
    {
      description:
        "Dashboard KPIs for the organization. Requires the finance scope.",
      scopeChallenge: financeScope,
    },
    async () => runTool(() => deps.report.getKpis(actor)),
  );

  server.registerTool(
    "get_dashboard_overview",
    {
      description:
        "Which dashboard areas the caller can view or manage, based on the member role.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.dashboard.getOverview(actor)),
  );
}
