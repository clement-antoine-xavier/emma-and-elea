import {handleApi, jsonError, parseBody} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {catalogItemSchema} from "@/server/validators/api.schema";
import {catalogService} from "@/server/services/container";

type RouteContext = {params: Promise<{id: string}>};

export async function GET(
  request: Request,
  {params}: RouteContext,
): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  const {id} = await params;
  const item = await catalogService.getItem(caller.actor, id);

  return item
    ? Response.json(item)
    : jsonError(404, "NOT_FOUND", "Catalog item not found.");
}

export async function PATCH(
  request: Request,
  {params}: RouteContext,
): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:write"]);
  if (isResponse(caller)) return caller;

  const body = await parseBody(request, catalogItemSchema);
  if (body instanceof Response) return body;

  const {id} = await params;

  return handleApi(() =>
    catalogService.updateItem(caller.actor, id, body),
  );
}
