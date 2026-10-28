import {auth} from "@/lib/auth";

/**
 * RFC 9728 places the protected-resource metadata on the resource server's
 * origin, and RFC 8414 allows the authorization-server metadata at the
 * origin with the issuer path inserted. Better Auth serves both from its
 * handler, but Next only routes `/api/auth/**` there. These route handlers
 * forward the original URL unchanged; the handler matches on the full path.
 */
export async function GET(request: Request): Promise<Response> {
  return auth.handler(request);
}
