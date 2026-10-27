import {headers} from "next/headers";
import {getActorContext} from "@/server/auth/actor";
import {invitationService} from "@/server/services/container";
import {acceptInvitationAction} from "@/app/actions/invitation.actions";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";

jest.mock("next/headers", () => ({headers: jest.fn()}));
jest.mock("@/server/auth/actor", () => ({getActorContext: jest.fn()}));
jest.mock("@/server/services/container", () => ({
  invitationService: {acceptInvitation: jest.fn()},
}));

const getActor = getActorContext as jest.Mock;
const acceptInvitation = invitationService.acceptInvitation as jest.Mock;
const headersMock = headers as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  headersMock.mockResolvedValue(new Headers());
});

describe("acceptInvitationAction", () => {
  it("rejects a visitor", async () => {
    getActor.mockResolvedValue(null);

    await expect(
      acceptInvitationAction({invitationId: "inv_1"}),
    ).resolves.toEqual({ok: false, error: "unauthenticated"});
  });

  it("rejects a blank invitation id", async () => {
    getActor.mockResolvedValue(actorFor());

    await expect(
      acceptInvitationAction({invitationId: ""}),
    ).resolves.toEqual({ok: false, error: "generic"});
  });

  it("returns the new organization", async () => {
    getActor.mockResolvedValue(actorFor());
    acceptInvitation.mockResolvedValue({organizationId: "org_2"});

    await expect(
      acceptInvitationAction({invitationId: "inv_1"}),
    ).resolves.toEqual({ok: true, organizationId: "org_2"});
    expect(acceptInvitation).toHaveBeenCalledWith(
      expect.objectContaining({userId: "user_1"}),
      "inv_1",
      expect.any(Headers),
    );
  });

  it.each([
    ["INVITATION_EXPIRED", "expired"],
    ["INVITATION_NOT_PENDING", "unavailable"],
    ["WRONG_ACCOUNT", "wrongAccount"],
    ["FORBIDDEN", "forbidden"],
    ["NOT_FOUND", "generic"],
  ] as const)("maps %s to %s", async (code, expected) => {
    getActor.mockResolvedValue(actorFor());
    acceptInvitation.mockRejectedValue(new DomainError(code));

    await expect(
      acceptInvitationAction({invitationId: "inv_1"}),
    ).resolves.toEqual({ok: false, error: expected});
  });
});
