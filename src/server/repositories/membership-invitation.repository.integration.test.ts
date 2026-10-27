import {prisma} from "@/lib/prisma";
import {membershipRepository} from "@/server/repositories/membership.repository";
import {invitationRepository} from "@/server/repositories/invitation.repository";
import {createFixture, type Fixture} from "@/test-utils/integration/db";

describe("membership and invitation repositories", () => {
  let fixture: Fixture;

  beforeAll(async () => {
    fixture = await createFixture();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("finds memberships with their organization, oldest first", async () => {
    const memberships = await membershipRepository.findMembershipsForUser(
      fixture.userId,
    );

    expect(memberships).toEqual([
      expect.objectContaining({
        id: fixture.memberId,
        organizationId: fixture.organizationId,
        role: "owner",
        organization: expect.objectContaining({name: expect.any(String)}),
      }),
    ]);
    await expect(
      membershipRepository.findMembershipsForUser("user_other"),
    ).resolves.toEqual([]);
  });

  it("lists members and finds one inside an organization", async () => {
    const members = await membershipRepository.listMembers(
      fixture.organizationId,
    );
    expect(members).toEqual([
      expect.objectContaining({
        id: fixture.memberId,
        userId: fixture.userId,
        name: "Integration actor",
        role: "owner",
      }),
    ]);

    await expect(
      membershipRepository.findMemberByIdInOrganization(
        fixture.memberId,
        fixture.organizationId,
      ),
    ).resolves.toEqual({
      id: fixture.memberId,
      userId: fixture.userId,
      role: "owner",
    });
    await expect(
      membershipRepository.findMemberByIdInOrganization(
        fixture.memberId,
        "org_other",
      ),
    ).resolves.toBeNull();
  });

  it("tracks pending invitations and their expiry", async () => {
    const invitation = await prisma.invitation.create({
      data: {
        id: `invitation_it_${Date.now()}`,
        organizationId: fixture.organizationId,
        email: `invitee-${Date.now()}@example.com`,
        role: "staff",
        status: "pending",
        expiresAt: new Date("2026-11-10T00:00:00.000Z"),
        inviterId: fixture.userId,
      },
      select: {id: true, email: true},
    });

    await expect(
      invitationRepository.findById(invitation.id),
    ).resolves.toMatchObject({
      id: invitation.id,
      email: invitation.email,
      status: "pending",
    });
    await expect(
      invitationRepository.findById("missing"),
    ).resolves.toBeNull();

    const pending = await invitationRepository.listPending(
      fixture.organizationId,
      new Date("2026-11-01T00:00:00.000Z"),
    );
    expect(pending.map((row) => row.id)).toEqual([invitation.id]);

    const expired = await invitationRepository.listPending(
      fixture.organizationId,
      new Date("2026-11-11T00:00:00.000Z"),
    );
    expect(expired).toEqual([]);

    await expect(
      invitationRepository.findPendingInOrganization(
        invitation.id,
        fixture.organizationId,
      ),
    ).resolves.toMatchObject({id: invitation.id});
    await expect(
      invitationRepository.findPendingInOrganization(
        invitation.id,
        "org_other",
      ),
    ).resolves.toBeNull();
  });
});
