
import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import type {
  EquipmentInput,
  EquipmentRepository,
} from "@/server/repositories/equipment.repository";
import {isForeignKeyConstraintError} from "@/server/repositories/errors";
import type {EquipmentRecord} from "@/server/repositories/types";

export type EquipmentView = {
  equipment: EquipmentRecord[];
  canWrite: boolean;
};

export interface EquipmentService {
  getEquipment(actor: Actor | null): Promise<EquipmentView>;
  createEquipment(
    actor: Actor | null,
    input: EquipmentInput,
  ): Promise<EquipmentRecord>;
  archiveEquipment(actor: Actor | null, id: string): Promise<void>;
}

export function createEquipmentService(deps: {
  equipmentRepository: EquipmentRepository;
}): EquipmentService {
  return {
    async getEquipment(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "equipment:read");

      return {
        equipment: await deps.equipmentRepository.list(actor.organizationId),
        canWrite: isGranted(actor, "equipment:write"),
      };
    },

    async createEquipment(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "equipment:write");

      try {
        return await deps.equipmentRepository.create(
          actor.organizationId,
          input,
        );
      } catch (error) {
        if (isForeignKeyConstraintError(error)) {
          throw new DomainError("NOT_FOUND", undefined, {cause: error});
        }
        throw error;
      }
    },

    async archiveEquipment(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "equipment:write");

      const archived = await deps.equipmentRepository.archive(
        actor.organizationId,
        id,
      );
      if (!archived) throw new DomainError("NOT_FOUND");
    },
  };
}
