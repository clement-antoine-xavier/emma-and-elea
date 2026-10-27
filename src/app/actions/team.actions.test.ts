import {headers} from "next/headers";
import {getActorContext} from "@/server/auth/actor";
import {teamService} from "@/server/services/container";
import {
  cancelInvitationAction,
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
} from "@/app/actions/team.actions";
import {DomainError} from "@/server/domain/errors";
import {actorFor} from "@/test-utils/actor";

jest.mock("next/headers", () => ({headers: jest.fn()}));
jest.mock("@/server/auth/actor", () => ({getActorContext: jest.fn()}));
jest.mock("@/server/services/container", () => ({
  teamService: {
    inviteMember: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
    cancelInvitation: jest.fn(),
  },
}));

const getActor = getActorContext as jest.Mock;
const team = teamService as unknown as Record<string, jest.Mock>;
const headersMock = headers as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  getActor.mockResolvedValue(actorFor("owner"));
  headersMock.mockResolvedValue(new Headers());
});

describe("inviteMemberAction", () => {
  it("rejects a visitor", async () => {
    getActor.mockResolvedValue(null);

    await expect(
      inviteMemberAction({email: "ada@example.com", role: "staff"}),
    ).resolves.toEqual({ok: false, error: "unauthenticated"});
  });

  it("distinguishes an invalid email from an invalid role", async () => {
    await expect(
      inviteMemberAction({email: "not-an-email", role: "staff"}),
    ).resolves.toEqual({ok: false, error: "invalidEmail"});

    await expect(
      inviteMemberAction({email: "ada@example.com", role: "member"}),
    ).resolves.toEqual({ok: false, error: "invalidRole"});
    expect(team.inviteMember).not.toHaveBeenCalled();
  });

  it("returns the invitation with an ISO expiry", async () => {
    team.inviteMember.mockResolvedValue({
      id: "inv_1",
      email: "ada@example.com",
      expiresAt: new Date("2026-11-01T10:00:00.000Z"),
    });

    await expect(
      inviteMemberAction({email: "ada@example.com", role: "staff"}),
    ).resolves.toEqual({
      ok: true,
      invitation: {
        id: "inv_1",
        email: "ada@example.com",
        expiresAt: "2026-11-01T10:00:00.000Z",
      },
    });
  });

  it.each([
    ["ALREADY_MEMBER", "alreadyMember"],
    ["ALREADY_INVITED", "alreadyInvited"],
    ["FORBIDDEN", "forbidden"],
    ["INVALID_INPUT", "invalidEmail"],
    ["CONFLICT", "generic"],
  ] as const)("maps %s to %s", async (code, expected) => {
    team.inviteMember.mockRejectedValue(new DomainError(code));

    await expect(
      inviteMemberAction({email: "ada@example.com", role: "staff"}),
    ).resolves.toEqual({ok: false, error: expected});
  });
});

describe("updateMemberRoleAction", () => {
  it("rejects an invalid role and a missing member id", async () => {
    await expect(
      updateMemberRoleAction({memberId: "member_1", role: "nope"}),
    ).resolves.toEqual({ok: false, error: "invalidRole"});

    await expect(
      updateMemberRoleAction({memberId: "", role: "staff"}),
    ).resolves.toEqual({ok: false, error: "generic"});
  });

  it("updates the role", async () => {
    team.updateMemberRole.mockResolvedValue(undefined);

    await expect(
      updateMemberRoleAction({memberId: "member_1", role: "sales"}),
    ).resolves.toEqual({ok: true});
    expect(team.updateMemberRole).toHaveBeenCalledWith(
      expect.objectContaining({role: "owner"}),
      {memberId: "member_1", role: "sales"},
      expect.any(Headers),
    );
  });

  it.each([
    ["CANNOT_MANAGE_OWNER", "cannotManageOwner"],
    ["CANNOT_CHANGE_OWN_ROLE", "cannotChangeOwnRole"],
    ["INVALID_ROLE", "invalidRole"],
    ["LAST_OWNER", "lastOwner"],
  ] as const)("maps %s to %s", async (code, expected) => {
    team.updateMemberRole.mockRejectedValue(new DomainError(code));

    await expect(
      updateMemberRoleAction({memberId: "member_1", role: "sales"}),
    ).resolves.toEqual({ok: false, error: expected});
  });
});

describe("removeMemberAction and cancelInvitationAction", () => {
  it("validates the id before calling the service", async () => {
    await expect(removeMemberAction({memberId: ""})).resolves.toEqual({
      ok: false,
      error: "generic",
    });
    await expect(
      cancelInvitationAction({invitationId: " "}),
    ).resolves.toEqual({ok: false, error: "generic"});
    expect(team.removeMember).not.toHaveBeenCalled();
    expect(team.cancelInvitation).not.toHaveBeenCalled();
  });

  it("removes a member", async () => {
    team.removeMember.mockResolvedValue(undefined);

    await expect(removeMemberAction({memberId: "member_1"})).resolves.toEqual({
      ok: true,
    });
    expect(team.removeMember).toHaveBeenCalledWith(
      expect.any(Object),
      {memberId: "member_1"},
      expect.any(Headers),
    );
  });

  it("cancels an invitation", async () => {
    team.cancelInvitation.mockResolvedValue(undefined);

    await expect(
      cancelInvitationAction({invitationId: "inv_1"}),
    ).resolves.toEqual({ok: true});
    expect(team.cancelInvitation).toHaveBeenCalledWith(
      expect.any(Object),
      {invitationId: "inv_1"},
      expect.any(Headers),
    );
  });

  it("maps a forbidden removal", async () => {
    team.removeMember.mockRejectedValue(new DomainError("FORBIDDEN"));

    await expect(removeMemberAction({memberId: "member_1"})).resolves.toEqual({
      ok: false,
      error: "forbidden",
    });
  });
});
