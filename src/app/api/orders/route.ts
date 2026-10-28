import {handleApi} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {orderService} from "@/server/services/container";

export async function GET(request: Request): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  const params = new URL(request.url).searchParams;

  return handleApi(() =>
    orderService.getOrders(caller.actor, {
      search: params.get("search") ?? undefined,
      status: params.get("status") ?? undefined,
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
    }),
  );
}
