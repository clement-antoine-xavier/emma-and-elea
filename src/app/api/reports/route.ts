import {handleApi} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {reportService} from "@/server/services/container";

export async function GET(request: Request): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:finance"]);
  if (isResponse(caller)) return caller;

  return handleApi(() => reportService.getReports(caller.actor));
}
