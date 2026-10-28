import {handleApi} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {stockService} from "@/server/services/container";

export async function GET(request: Request): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  return handleApi(() => stockService.getLevels(caller.actor));
}
