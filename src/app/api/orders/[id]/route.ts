import {jsonError} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {orderService} from "@/server/services/container";

type RouteContext = {params: Promise<{id: string}>};

export async function GET(
  request: Request,
  {params}: RouteContext,
): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  const {id} = await params;
  const order = await orderService.getOrder(caller.actor, id);

  return order ? Response.json(order) : jsonError(404, "NOT_FOUND", "Order not found.");
}
