import {jsonError} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {stockService} from "@/server/services/container";

type RouteContext = {params: Promise<{id: string}>};

export async function GET(
  request: Request,
  {params}: RouteContext,
): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  const {id} = await params;
  const lot = await stockService.getLot(caller.actor, id);

  return lot
    ? Response.json(lot)
    : jsonError(404, "NOT_FOUND", "Stock lot not found.");
}
