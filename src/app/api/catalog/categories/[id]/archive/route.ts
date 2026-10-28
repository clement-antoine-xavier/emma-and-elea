import {handleApi} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {catalogService} from "@/server/services/container";

type RouteContext = {params: Promise<{id: string}>};

export async function POST(
  request: Request,
  {params}: RouteContext,
): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:write"]);
  if (isResponse(caller)) return caller;

  const {id} = await params;

  return handleApi(() => catalogService.archiveCategory(caller.actor, id));
}
