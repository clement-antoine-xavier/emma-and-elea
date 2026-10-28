import {handleApi, jsonError, parseBody} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {toCustomerInput} from "@/server/api/inputs";
import {customerSchema} from "@/server/validators/api.schema";
import {customerService} from "@/server/services/container";

type RouteContext = {params: Promise<{id: string}>};

export async function GET(
  request: Request,
  {params}: RouteContext,
): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  const {id} = await params;
  const customer = await customerService.getCustomer(caller.actor, id);

  return customer
    ? Response.json(customer)
    : jsonError(404, "NOT_FOUND", "Customer not found.");
}

export async function PATCH(
  request: Request,
  {params}: RouteContext,
): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:write"]);
  if (isResponse(caller)) return caller;

  const body = await parseBody(request, customerSchema);
  if (body instanceof Response) return body;

  const {id} = await params;

  return handleApi(() =>
    customerService.updateCustomer(caller.actor, id, toCustomerInput(body)),
  );
}
