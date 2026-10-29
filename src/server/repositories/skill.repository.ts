import {prisma} from "@/lib/prisma";
import type {
  EmployeeSkillRecord,
  SkillLevelName,
  SkillRecord,
} from "@/lib/dto";

export type SkillInput = {
  code: string;
  name: string;
  description: string | null;
};

const skillSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  archivedAt: true,
} as const;

export interface SkillRepository {
  list(organizationId: string): Promise<SkillRecord[]>;
  create(organizationId: string, input: SkillInput): Promise<SkillRecord>;
  archive(organizationId: string, id: string): Promise<boolean>;
  skillExists(organizationId: string, id: string): Promise<boolean>;
  employeeExists(organizationId: string, id: string): Promise<boolean>;
  employeeSkills(
    organizationId: string,
    employeeId: string,
  ): Promise<EmployeeSkillRecord[]>;
  addEmployeeSkill(
    organizationId: string,
    employeeId: string,
    input: {
      skillId: string;
      level: SkillLevelName;
      certifiedOn: Date | null;
    },
  ): Promise<void>;
  removeEmployeeSkill(
    organizationId: string,
    employeeId: string,
    id: string,
  ): Promise<boolean>;
}

export const skillRepository: SkillRepository = {
  async list(organizationId) {
    return prisma.skill.findMany({
      where: {organizationId},
      orderBy: [{archivedAt: "asc"}, {name: "asc"}],
      select: skillSelect,
    });
  },

  async create(organizationId, input) {
    return prisma.skill.create({
      data: {organizationId, ...input},
      select: skillSelect,
    });
  },

  async archive(organizationId, id) {
    const result = await prisma.skill.updateMany({
      where: {id, organizationId, archivedAt: null},
      data: {archivedAt: new Date()},
    });

    return result.count > 0;
  },

  async skillExists(organizationId, id) {
    const skill = await prisma.skill.findFirst({
      where: {id, organizationId},
      select: {id: true},
    });

    return skill !== null;
  },

  async employeeExists(organizationId, id) {
    const employee = await prisma.employeeProfile.findFirst({
      where: {id, organizationId},
      select: {id: true},
    });

    return employee !== null;
  },

  async employeeSkills(organizationId, employeeId) {
    const rows = await prisma.employeeSkill.findMany({
      where: {organizationId, employeeId},
      orderBy: {skill: {name: "asc"}},
      select: {
        id: true,
        skillId: true,
        skill: {select: {name: true}},
        level: true,
        certifiedOn: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      skillId: row.skillId,
      skillName: row.skill.name,
      level: row.level as SkillLevelName,
      certifiedOn: row.certifiedOn,
    }));
  },

  async addEmployeeSkill(organizationId, employeeId, input) {
    await prisma.employeeSkill.upsert({
      where: {
        employeeId_skillId: {
          employeeId,
          skillId: input.skillId,
        },
      },
      create: {
        organizationId,
        employeeId,
        skillId: input.skillId,
        level: input.level,
        certifiedOn: input.certifiedOn,
      },
      update: {
        level: input.level,
        certifiedOn: input.certifiedOn,
      },
    });
  },

  async removeEmployeeSkill(organizationId, employeeId, id) {
    const result = await prisma.employeeSkill.deleteMany({
      where: {id, employeeId, organizationId},
    });

    return result.count > 0;
  },
};
