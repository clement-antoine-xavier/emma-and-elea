import {handleApi, parseBody} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {catalogItemSchema} from "@/server/validators/api.schema";
import {catalogService} from "@/server/services/container";

export async function GET(request: Request): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  const params = new URL(request.url).searchParams;

  return handleApi(() =>
    catalogService.getCatalogView(caller.actor, {
      search: params.get("search") ?? undefined,
      type: params.get("type") ?? undefined,
      categoryId: params.get("categoryId") ?? undefined,
      includeArchived: params.get("includeArchived") ?? undefined,
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
    }),
  );
}

export async function POST(request: Request): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:write"]);
  if (isResponse(caller)) return caller;

  const body = await parseBody(request, catalogItemSchema);
  if (body instanceof Response) return body;

  return handleApi(
    () => catalogService.createItem(caller.actor, body),
    201,
  );
}
