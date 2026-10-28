/** @jest-environment node */

import {
  requestToResourceInput,
  verifyAccessTokenRequest,
} from "better-auth/oauth2";
import {createResourceServerChallenge} from "@better-auth/oauth-provider";
import {resolveTokenActor} from "@/server/auth/token-actor";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";
import {authenticateApiRequest, isResponse} from "./token-auth";

jest.mock("@/lib/auth", () => ({
  auth: {$context: Promise.resolve({internalAdapter: {}})},
}));

jest.mock("better-auth/oauth2", () => ({
  requestToResourceInput: jest.fn(() => ({})),
  verifyAccessTokenRequest: jest.fn(),
  createDpopReplayStore: jest.fn(() => ({})),
}));

jest.mock("@better-auth/oauth-provider", () => ({
  createResourceServerChallenge: jest.fn(),
}));

jest.mock("@/server/auth/token-actor", () => ({
  resolveTokenActor: jest.fn(),
}));

const verify = verifyAccessTokenRequest as unknown as jest.Mock;
const toInput = requestToResourceInput as unknown as jest.Mock;
const challenge = createResourceServerChallenge as unknown as jest.Mock;
const resolveActor = resolveTokenActor as unknown as jest.Mock;

function request() {
  return new Request("http://localhost:3000/api/me", {
    headers: {authorization: "Bearer token"},
  });
}

function challengeError(
  status: "UNAUTHORIZED" | "FORBIDDEN",
  message: string,
) {
  return {
    status,
    statusCode: status === "FORBIDDEN" ? 403 : 401,
    message,
    headers: {
      "WWW-Authenticate":
        'Bearer resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource/api", scope="api:read"',
    },
  };
}

describe("authenticateApiRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    toInput.mockReturnValue({});
  });

  it("returns the actor for a valid token", async () => {
    verify.mockResolvedValue({sub: "user_1"});
    resolveActor.mockResolvedValue(actorFor("owner"));

    const caller = await authenticateApiRequest(request(), ["api:read"]);

    expect(isResponse(caller)).toBe(false);
    if (isResponse(caller)) throw new Error("unreachable");

    expect(caller.actor.organizationId).toBe("org_1");
    expect(verify).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({requiredScopes: ["api:read"]}),
    );
  });

  it("answers 401 with the API challenge for a missing token", async () => {
    verify.mockRejectedValue(new Error("missing authorization header"));
    challenge.mockReturnValue(
      challengeError("UNAUTHORIZED", "missing authorization header"),
    );

    const result = await authenticateApiRequest(request(), ["api:read"]);

    expect(isResponse(result)).toBe(true);
    if (!isResponse(result)) throw new Error("unreachable");

    expect(result.status).toBe(401);
    expect(result.headers.get("www-authenticate")).toContain(
      "/.well-known/oauth-protected-resource/api",
    );
    await expect(result.json()).resolves.toMatchObject({
      error: "invalid_token",
    });
  });

  it("answers 403 insufficient_scope when the token lacks the scope", async () => {
    verify.mockRejectedValue(new Error("insufficient scope"));
    challenge.mockReturnValue(
      challengeError("FORBIDDEN", "Missing required scope api:finance"),
    );

    const result = await authenticateApiRequest(request(), ["api:finance"]);

    expect(isResponse(result)).toBe(true);
    if (!isResponse(result)) throw new Error("unreachable");

    expect(result.status).toBe(403);
    await expect(result.json()).resolves.toMatchObject({
      error: "insufficient_scope",
    });
  });

  it("answers 403 when the user is no longer a member", async () => {
    verify.mockResolvedValue({sub: "user_1"});
    resolveActor.mockRejectedValue(
      new DomainError("FORBIDDEN", "TOKEN_MEMBERSHIP_REQUIRED"),
    );

    const result = await authenticateApiRequest(request(), ["api:read"]);

    expect(isResponse(result)).toBe(true);
    if (!isResponse(result)) throw new Error("unreachable");

    expect(result.status).toBe(403);
    await expect(result.json()).resolves.toMatchObject({
      error: {code: "FORBIDDEN", message: "TOKEN_MEMBERSHIP_REQUIRED"},
    });
  });

  it("answers 500 when the challenge cannot be built", async () => {
    verify.mockRejectedValue(new Error("boom"));
    challenge.mockReturnValue(undefined);

    const result = await authenticateApiRequest(request());

    expect(isResponse(result)).toBe(true);
    if (!isResponse(result)) throw new Error("unreachable");

    expect(result.status).toBe(500);
  });
});
