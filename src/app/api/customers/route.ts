import {handleApi, parseBody} from "@/server/api/respond";
import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";
import {toCustomerInput} from "@/server/api/inputs";
import {customerSchema} from "@/server/validators/api.schema";
import {customerService} from "@/server/services/container";

export async function GET(request: Request): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  return handleApi(() => customerService.getCustomers(caller.actor));
}

export async function POST(request: Request): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:write"]);
  if (isResponse(caller)) return caller;

  const body = await parseBody(request, customerSchema);
  if (body instanceof Response) return body;

  return handleApi(
    () => customerService.createCustomer(caller.actor, toCustomerInput(body)),
    201,
  );
}
