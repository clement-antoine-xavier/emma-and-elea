import { expect, test } from "@playwright/test";

const baseURL = "http://localhost:3000";

test("the MCP endpoint challenges unauthenticated callers with RFC 9728 metadata", async ({
  request,
}) => {
  const response = await request.post("/mcp", {
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "mcp-protocol-version": "2026-07-28",
    },
    data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
  });

  expect(response.status()).toBe(401);

  const challenge = response.headers()["www-authenticate"];
  expect(challenge).toContain("Bearer");
  expect(challenge).toContain(
    'resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource/mcp"',
  );
  expect(challenge).toContain("api:read");
});

test("the MCP endpoint answers GET with 405", async ({ request }) => {
  const response = await request.get("/mcp", {
    headers: {"mcp-protocol-version": "2026-07-28"},
  });

  expect(response.status()).toBe(405);
});

test("protected resource metadata advertises the MCP resource and scopes", async ({
  request,
}) => {
  const response = await request.get(
    "/.well-known/oauth-protected-resource/mcp",
  );

  expect(response.ok()).toBe(true);

  const metadata = (await response.json()) as {
    resource: string;
    authorization_servers: string[];
    scopes_supported: string[];
  };

  expect(metadata.resource).toBe(`${baseURL}/mcp`);
  expect(metadata.authorization_servers).toEqual([`${baseURL}/api/auth`]);
  expect(metadata.scopes_supported).toEqual(
    expect.arrayContaining(["api:read", "api:write", "api:execute", "api:finance"]),
  );
});

test("authorization server metadata is published", async ({ request }) => {
  const response = await request.get(
    "/api/auth/.well-known/oauth-authorization-server",
  );

  expect(response.ok()).toBe(true);

  const metadata = (await response.json()) as {
    issuer: string;
    jwks_uri: string;
    scopes_supported: string[];
    client_id_metadata_document_supported?: boolean;
  };

  expect(metadata.issuer).toBe(`${baseURL}/api/auth`);
  expect(metadata.jwks_uri).toBe(`${baseURL}/api/auth/jwks`);
  expect(metadata.scopes_supported).toEqual(
    expect.arrayContaining(["openid", "offline_access", "api:read"]),
  );
  expect(metadata.client_id_metadata_document_supported).toBe(true);
});

test("authorization server metadata is also served at the RFC 8414 path-inserted location", async ({
  request,
}) => {
  const response = await request.get(
    "/.well-known/oauth-authorization-server/api/auth",
  );

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    issuer: `${baseURL}/api/auth`,
  });
});

test("the REST API challenges unauthenticated callers with the API resource metadata", async ({
  request,
}) => {
  const response = await request.get("/api/me");

  expect(response.status()).toBe(401);

  const challenge = response.headers()["www-authenticate"];
  expect(challenge).toContain("Bearer");
  expect(challenge).toContain(
    'resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource/api"',
  );
  expect(challenge).toContain("api:read");
});

test("protected resource metadata advertises the REST API resource and scopes", async ({
  request,
}) => {
  const response = await request.get(
    "/.well-known/oauth-protected-resource/api",
  );

  expect(response.ok()).toBe(true);

  const metadata = (await response.json()) as {
    resource: string;
    authorization_servers: string[];
    scopes_supported: string[];
  };

  expect(metadata.resource).toBe(`${baseURL}/api`);
  expect(metadata.authorization_servers).toEqual([`${baseURL}/api/auth`]);
  expect(metadata.scopes_supported).toEqual(
    expect.arrayContaining(["api:read", "api:write", "api:execute", "api:finance"]),
  );
});
