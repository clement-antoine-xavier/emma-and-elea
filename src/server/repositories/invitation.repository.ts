import {prisma} from "@/lib/prisma";
import type {
  InvitationDetailRecord,
  PendingInvitationRecord,
} from "./types";

export interface InvitationRepository {
  listPending(
    organizationId: string,
    now: Date,
  ): Promise<PendingInvitationRecord[]>;
  findById(invitationId: string): Promise<InvitationDetailRecord | null>;
  findPendingInOrganization(
    invitationId: string,
    organizationId: string,
  ): Promise<{id: string} | null>;
}

export const invitationRepository: InvitationRepository = {
  async listPending(organizationId, now) {
    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId,
        status: "pending",
        expiresAt: {gt: now},
      },
      orderBy: {createdAt: "asc"},
      select: {id: true, email: true, role: true, expiresAt: true},
    });

    return invitations.map((invitation) => ({
      ...invitation,
      role: invitation.role ?? "staff",
    }));
  },

  async findById(invitationId) {
    const invitation = await prisma.invitation.findUnique({
      where: {id: invitationId},
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        organization: {select: {id: true, name: true, slug: true}},
        user: {select: {name: true, email: true}},
      },
    });

    if (!invitation) return null;

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role ?? "staff",
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organization: invitation.organization,
      inviter: invitation.user,
    };
  },

  async findPendingInOrganization(invitationId, organizationId) {
    const invitation = await prisma.invitation.findFirst({
      where: {id: invitationId, organizationId},
      select: {id: true},
    });

    return invitation ?? null;
  },
};
