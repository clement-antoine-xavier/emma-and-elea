import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import type {
  EmployeeSkillRecord,
  SkillLevelName,
  SkillRecord,
} from "@/lib/dto";
import {isUniqueConstraintError} from "@/server/repositories/errors";
import type {
  SkillInput,
  SkillRepository,
} from "@/server/repositories/skill.repository";

export type SkillView = {
  skills: SkillRecord[];
  canWrite: boolean;
};

export interface SkillService {
  getSkills(actor: Actor | null): Promise<SkillView>;
  createSkill(actor: Actor | null, input: SkillInput): Promise<SkillRecord>;
  archiveSkill(actor: Actor | null, id: string): Promise<void>;
  getEmployeeSkills(
    actor: Actor | null,
    employeeId: string,
  ): Promise<{skills: EmployeeSkillRecord[]; canWrite: boolean}>;
  addEmployeeSkill(
    actor: Actor | null,
    employeeId: string,
    input: {
      skillId: string;
      level: SkillLevelName;
      certifiedOn: Date | null;
    },
  ): Promise<void>;
  removeEmployeeSkill(
    actor: Actor | null,
    employeeId: string,
    id: string,
  ): Promise<void>;
}

export function createSkillService(deps: {
  skillRepository: SkillRepository;
}): SkillService {
  return {
    async getSkills(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:read");

      return {
        skills: await deps.skillRepository.list(actor.organizationId),
        canWrite: isGranted(actor, "team:write"),
      };
    },

    async createSkill(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      try {
        return await deps.skillRepository.create(
          actor.organizationId,
          input,
        );
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new DomainError("DUPLICATE_CODE", undefined, {cause: error});
        }
        throw error;
      }
    },

    async archiveSkill(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      const archived = await deps.skillRepository.archive(
        actor.organizationId,
        id,
      );
      if (!archived) throw new DomainError("NOT_FOUND");
    },

    async getEmployeeSkills(actorInput, employeeId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:read");

      const employee = await deps.skillRepository.employeeExists(
        actor.organizationId,
        employeeId,
      );
      if (!employee) throw new DomainError("NOT_FOUND");

      return {
        skills: await deps.skillRepository.employeeSkills(
          actor.organizationId,
          employeeId,
        ),
        canWrite: isGranted(actor, "team:write"),
      };
    },

    async addEmployeeSkill(actorInput, employeeId, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      const [employee, skill] = await Promise.all([
        deps.skillRepository.employeeExists(actor.organizationId, employeeId),
        deps.skillRepository.skillExists(
          actor.organizationId,
          input.skillId,
        ),
      ]);
      if (!employee || !skill) throw new DomainError("NOT_FOUND");

      await deps.skillRepository.addEmployeeSkill(
        actor.organizationId,
        employeeId,
        input,
      );
    },

    async removeEmployeeSkill(actorInput, employeeId, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "team:write");

      const removed = await deps.skillRepository.removeEmployeeSkill(
        actor.organizationId,
        employeeId,
        id,
      );
      if (!removed) throw new DomainError("NOT_FOUND");
    },
  };
}
