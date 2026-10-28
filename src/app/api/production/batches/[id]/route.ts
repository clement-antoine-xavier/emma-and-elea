import {jsonError} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {productionService} from "@/server/services/container";

type RouteContext = {params: Promise<{id: string}>};

export async function GET(
  request: Request,
  {params}: RouteContext,
): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  const {id} = await params;
  const batch = await productionService.getBatch(caller.actor, id);

  return batch
    ? Response.json(batch)
    : jsonError(404, "NOT_FOUND", "Production batch not found.");
}
