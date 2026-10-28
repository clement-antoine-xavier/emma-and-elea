import {jsonError} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {dispatchService} from "@/server/services/container";

type RouteContext = {params: Promise<{id: string}>};

export async function GET(
  request: Request,
  {params}: RouteContext,
): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  const {id} = await params;
  const dispatch = await dispatchService.getDispatch(caller.actor, id);

  return dispatch
    ? Response.json(dispatch)
    : jsonError(404, "NOT_FOUND", "Dispatch not found.");
}
