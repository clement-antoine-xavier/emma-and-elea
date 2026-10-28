import {handleApi, parseBody} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {categoryCreateSchema} from "@/server/validators/api.schema";
import {catalogService} from "@/server/services/container";

export async function GET(request: Request): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  return handleApi(() => catalogService.getCategoriesView(caller.actor));
}

export async function POST(request: Request): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:write"]);
  if (isResponse(caller)) return caller;

  const body = await parseBody(request, categoryCreateSchema);
  if (body instanceof Response) return body;

  return handleApi(
    () => catalogService.createCategory(caller.actor, body),
    201,
  );
}
