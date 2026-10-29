import {createSkillService} from "@/server/services/skill.service";
import type {SkillRepository} from "@/server/repositories/skill.repository";
import type {EmployeeSkillRecord, SkillRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";

const skill: SkillRecord = {
  id: "skill_1",
  code: "BAKE",
  name: "Baking",
  description: null,
  archivedAt: null,
};

const assigned: EmployeeSkillRecord = {
  id: "employee_skill_1",
  skillId: "skill_1",
  skillName: "Baking",
  level: "ADVANCED",
  certifiedOn: null,
};

function repository(
  overrides: Partial<SkillRepository> = {},
): SkillRepository {
  return {
    list: jest.fn().mockResolvedValue([skill]),
    create: jest.fn().mockResolvedValue(skill),
    archive: jest.fn().mockResolvedValue(true),
    skillExists: jest.fn().mockResolvedValue(true),
    employeeExists: jest.fn().mockResolvedValue(true),
    employeeSkills: jest.fn().mockResolvedValue([assigned]),
    addEmployeeSkill: jest.fn().mockResolvedValue(undefined),
    removeEmployeeSkill: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("skill service", () => {
  it("requires team:read to list skills", async () => {
    const service = createSkillService({skillRepository: repository()});

    await expect(service.getSkills(actorFor("staff"))).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      service.getSkills(actorFor("production_manager")),
    ).resolves.toEqual({skills: [skill], canWrite: true});
  });

  it("lets only team writers create a skill", async () => {
    const repo = repository();
    const service = createSkillService({skillRepository: repo});
    const input = {code: "BAKE", name: "Baking", description: null};

    await expect(
      service.createSkill(actorFor("production_manager"), input),
    ).resolves.toEqual(skill);
    expect(repo.create).toHaveBeenCalledWith("org_1", input);

    await expect(
      service.createSkill(actorFor("sales"), input),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("refuses a skill from another tenant", async () => {
    const service = createSkillService({
      skillRepository: repository({skillExists: jest.fn().mockResolvedValue(false)}),
    });

    await expect(
      service.addEmployeeSkill(actorFor("owner"), "employee_1", {
        skillId: "skill_other",
        level: "EXPERT",
        certifiedOn: null,
      }),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("maps a unique-code violation", async () => {
    const service = createSkillService({
      skillRepository: repository({
        create: jest
          .fn()
          .mockRejectedValue({code: "P2002"}),
      }),
    });

    await expect(
      service.createSkill(actorFor("owner"), {
        code: "BAKE",
        name: "Baking",
        description: null,
      }),
    ).rejects.toMatchObject({code: "DUPLICATE_CODE"});
  });
});
