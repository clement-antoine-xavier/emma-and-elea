import {prisma} from "@/lib/prisma";
import type {
  MemberTargetRecord,
  MembershipActorRecord,
  MembershipWithOrganization,
  TeamMemberRecord,
} from "./types";

export interface MembershipRepository {
  findMembershipsForUser(userId: string): Promise<MembershipWithOrganization[]>;
  findMembershipForUserInOrganization(
    userId: string,
    organizationId: string,
  ): Promise<MembershipActorRecord | null>;
  findMemberByIdInOrganization(
    memberId: string,
    organizationId: string,
  ): Promise<MemberTargetRecord | null>;
  listMembers(organizationId: string): Promise<TeamMemberRecord[]>;
}

export const membershipRepository: MembershipRepository = {
  async findMembershipsForUser(userId) {
    return prisma.member.findMany({
      where: {userId},
      orderBy: {createdAt: "asc"},
      select: {
        id: true,
        organizationId: true,
        role: true,
        createdAt: true,
        organization: {select: {id: true, name: true, slug: true}},
      },
    });
  },

  async findMembershipForUserInOrganization(userId, organizationId) {
    return prisma.member.findFirst({
      where: {userId, organizationId},
      select: {
        id: true,
        organizationId: true,
        role: true,
        createdAt: true,
        organization: {select: {id: true, name: true, slug: true}},
        user: {select: {name: true, email: true, role: true}},
      },
    });
  },

  async findMemberByIdInOrganization(memberId, organizationId) {
    return prisma.member.findFirst({
      where: {id: memberId, organizationId},
      select: {id: true, userId: true, role: true},
    });
  },

  async listMembers(organizationId) {
    const members = await prisma.member.findMany({
      where: {organizationId},
      orderBy: {createdAt: "asc"},
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: {select: {name: true, email: true}},
      },
    });

    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      createdAt: member.createdAt,
    }));
  },
};
