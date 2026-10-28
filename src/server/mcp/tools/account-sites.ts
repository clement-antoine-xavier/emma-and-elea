import type {McpServer} from "@modelcontextprotocol/server";
import type {OrganizationActor} from "@/server/auth/types";
import {runTool} from "../result";
import {idSchema} from "@/server/validators/api.schema";
import {readScope, type McpDeps} from "./shared";

export function registerAccountTools(server: McpServer, actor: OrganizationActor) {
  server.registerTool(
    "whoami",
    {
      description:
        "Report the signed-in user, the organization bound to this token, the member role and the granted scopes.",
    },
    async () =>
      runTool(() => ({
        userId: actor.userId,
        name: actor.name,
        email: actor.email,
        organization: actor.organization,
        role: actor.role,
        scopes: [...(actor.scopes ?? [])].sort(),
      })),
  );
}

export function registerSiteTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "list_sites",
    {
      description:
        "List the organization's sites (workshops, shops) with their codes, kind, city and timezone.",
      scopeChallenge: readScope,
    },
    async () => runTool(() => deps.site.getSites(actor)),
  );

  server.registerTool(
    "get_site",
    {
      description: "Read one site by id.",
      inputSchema: idSchema,
      scopeChallenge: readScope,
    },
    async ({id}) => runTool(() => deps.site.getSite(actor, id)),
  );
}
