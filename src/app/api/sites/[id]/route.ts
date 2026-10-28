import {jsonError} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {siteService} from "@/server/services/container";

type RouteContext = {params: Promise<{id: string}>};

export async function GET(
  request: Request,
  {params}: RouteContext,
): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  const {id} = await params;
  const site = await siteService.getSite(caller.actor, id);

  return site ? Response.json(site) : jsonError(404, "NOT_FOUND", "Site not found.");
}
