import {authenticateApiRequest, isResponse} from "@/server/api/token-auth";

export async function GET(request: Request): Promise<Response> {
  const caller = await authenticateApiRequest(request, ["api:read"]);
  if (isResponse(caller)) return caller;

  const {actor} = caller;

  return Response.json({
    userId: actor.userId,
    name: actor.name,
    email: actor.email,
    organization: actor.organization,
    role: actor.role,
    scopes: [...(actor.scopes ?? [])].sort(),
  });
}
