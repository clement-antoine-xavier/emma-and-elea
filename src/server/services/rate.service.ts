
import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {
  isForeignKeyConstraintError,
  isUniqueConstraintError,
} from "@/server/repositories/errors";
import type {
  EnergyTariffInput,
  LabourRateInput,
  RateRepository,
} from "@/server/repositories/rate.repository";
import type {
  EnergyTariffRecord,
  LabourRateRecord,
} from "@/server/repositories/types";
import {DomainError} from "@/server/domain/errors";

export type RatesView = {
  labourRates: LabourRateRecord[];
  energyTariffs: EnergyTariffRecord[];
  canWrite: boolean;
};

export interface RateService {
  getRates(actor: Actor | null): Promise<RatesView>;
  createLabourRate(
    actor: Actor | null,
    input: LabourRateInput,
  ): Promise<LabourRateRecord>;
  archiveLabourRate(actor: Actor | null, id: string): Promise<void>;
  createEnergyTariff(
    actor: Actor | null,
    input: EnergyTariffInput,
  ): Promise<EnergyTariffRecord>;
  closeEnergyTariff(actor: Actor | null, id: string): Promise<void>;
}

/** Reference data failures (a bad site id, a duplicate day) are conflicts. */
function mapConstraint(error: unknown): never {
  if (isUniqueConstraintError(error)) {
    throw new DomainError("CONFLICT", undefined, {cause: error});
  }
  if (isForeignKeyConstraintError(error)) {
    throw new DomainError("NOT_FOUND", undefined, {cause: error});
  }
  throw error;
}

export function createRateService(deps: {
  rateRepository: RateRepository;
}): RateService {
  return {
    async getRates(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "cost:read");

      const [labourRates, energyTariffs] = await Promise.all([
        deps.rateRepository.listLabourRates(actor.organizationId),
        deps.rateRepository.listEnergyTariffs(actor.organizationId),
      ]);

      return {
        labourRates,
        energyTariffs,
        canWrite: isGranted(actor, "organization:update"),
      };
    },

    async createLabourRate(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "organization:update");

      try {
        return await deps.rateRepository.createLabourRate(
          actor.organizationId,
          input,
        );
      } catch (error) {
        mapConstraint(error);
      }
    },

    async archiveLabourRate(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "organization:update");

      const archived = await deps.rateRepository.archiveLabourRate(
        actor.organizationId,
        id,
      );
      if (!archived) throw new DomainError("NOT_FOUND");
    },

    async createEnergyTariff(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "organization:update");

      try {
        return await deps.rateRepository.createEnergyTariff(
          actor.organizationId,
          input,
        );
      } catch (error) {
        mapConstraint(error);
      }
    },

    async closeEnergyTariff(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "organization:update");

      const validTo = new Date();
      validTo.setUTCHours(0, 0, 0, 0);
      // `validTo` is exclusive, so ending "today" means the tariff stays valid
      // through the current business day.
      validTo.setUTCDate(validTo.getUTCDate() + 1);

      const closed = await deps.rateRepository.closeEnergyTariff(
        actor.organizationId,
        id,
        validTo,
      );
      if (!closed) throw new DomainError("NOT_FOUND");
    },
  };
}
