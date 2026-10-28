import {handleApi} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {stockService} from "@/server/services/container";

export async function GET(request: Request): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  const params = new URL(request.url).searchParams;

  return handleApi(() =>
    stockService.getLots(caller.actor, {
      search: params.get("search") ?? undefined,
      includeEmpty: params.get("includeEmpty") ?? undefined,
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
    }),
  );
}
