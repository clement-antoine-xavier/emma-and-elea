import {mcpHandler} from "@/server/mcp/handler";

// POST only: the 2026-07-28 transport is stateless, so Next answers GET and
// DELETE with 405.
export async function POST(request: Request): Promise<Response> {
  return mcpHandler(request);
}
