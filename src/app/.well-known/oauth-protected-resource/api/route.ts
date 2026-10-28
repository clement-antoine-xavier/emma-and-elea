import {apiResource, protectedResourceMetadata} from "@/lib/resources";

/**
 * RFC 9728 protected-resource metadata for the REST API. `mcp()` serves the MCP
 * document itself; this one is derived from the same configuration so both
 * advertise the same authorization server and scopes.
 *
 * Reading the request keeps the route dynamic under Cache Components: the
 * resource URL must be the runtime `API_RESOURCE_URL`, not the value present
 * when the build ran.
 */
export function GET(request: Request): Response {
  void new URL(request.url).origin;

  return Response.json(protectedResourceMetadata(apiResource), {
    headers: {"cache-control": "public, max-age=15"},
  });
}
