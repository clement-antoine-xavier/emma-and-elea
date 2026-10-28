import type {McpServer} from "@modelcontextprotocol/server";
import type {OrganizationActor} from "@/server/auth/types";
import {runTool} from "../result";
import {readScope, type McpDeps} from "./shared";

export function registerTeamTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "get_team",
    {
      description:
        "List team members with their role, plus pending invitations. Read-only.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.team.getTeamView(actor)),
  );
}
