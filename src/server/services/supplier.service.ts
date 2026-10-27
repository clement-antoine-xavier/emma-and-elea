import {can} from "@/lib/permissions";
import {
  assertOrganizationActor,
  assertPermission,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import type {
  SupplierDetailRecord,
  SupplierItemRecord,
  SupplierListRecord,
} from "@/lib/dto";
import {isUniqueConstraintError} from "@/server/repositories/errors";
import type {
  SupplierInput,
  SupplierItemInput,
  SupplierRepository,
} from "@/server/repositories/supplier.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";

export type SupplierItemView = {
  items: {id: string; code: string; name: string}[];
  units: {id: string; code: string; labelEn: string; labelFr: string}[];
};

export interface SupplierService {
  getSuppliers(
    actor: Actor | null,
  ): Promise<{suppliers: SupplierListRecord[]; canWrite: boolean}>;
  getSupplier(
    actor: Actor | null,
    id: string,
  ): Promise<SupplierDetailRecord | null>;
  getFormOptions(actor: Actor | null): Promise<SupplierItemView>;
  createSupplier(actor: Actor | null, input: SupplierInput): Promise<{id: string}>;
  updateSupplier(
    actor: Actor | null,
    id: string,
    input: SupplierInput,
  ): Promise<void>;
  archiveSupplier(actor: Actor | null, id: string): Promise<void>;
  createItem(
    actor: Actor | null,
    supplierId: string,
    input: SupplierItemInput,
  ): Promise<SupplierItemRecord>;
  closeItem(actor: Actor | null, id: string): Promise<void>;
}

function mapUnique(error: unknown): never {
  if (isUniqueConstraintError(error)) {
    throw new DomainError("CONFLICT", undefined, {cause: error});
  }
  throw error;
}

export function createSupplierService(deps: {
  supplierRepository: SupplierRepository;
  catalogRepository: CatalogRepository;
}): SupplierService {
  async function requireSupplier(organizationId: string, id: string) {
    const supplier = await deps.supplierRepository.findSummary(
      organizationId,
      id,
    );
    if (!supplier) throw new DomainError("NOT_FOUND");
    return supplier;
  }

  return {
    async getSuppliers(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "supplier:read");

      return {
        suppliers: await deps.supplierRepository.list(actor.organizationId),
        canWrite: can(actor.role, "supplier:write"),
      };
    },

    async getSupplier(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "supplier:read");

      return deps.supplierRepository.findById(actor.organizationId, id);
    },

    async getFormOptions(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "supplier:read");

      const [items, units] = await Promise.all([
        deps.catalogRepository.listItemOptions(actor.organizationId),
        deps.catalogRepository.listUnits(),
      ]);

      return {
        items: items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
        })),
        units: units.map((unit) => ({
          id: unit.id,
          code: unit.code,
          labelEn: unit.labelEn,
          labelFr: unit.labelFr,
        })),
      };
    },

    async createSupplier(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "supplier:write");

      try {
        const id = await deps.supplierRepository.create(
          actor.organizationId,
          {
            ...input,
            code: input.code.toUpperCase(),
          },
        );
        return {id};
      } catch (error) {
        mapUnique(error);
      }
    },

    async updateSupplier(actorInput, id, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "supplier:write");

      await requireSupplier(actor.organizationId, id);

      try {
        const updated = await deps.supplierRepository.update(
          actor.organizationId,
          id,
          {...input, code: input.code.toUpperCase()},
        );
        if (!updated) throw new DomainError("NOT_FOUND");
      } catch (error) {
        mapUnique(error);
      }
    },

    async archiveSupplier(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "supplier:write");

      await requireSupplier(actor.organizationId, id);
      const archived = await deps.supplierRepository.archive(
        actor.organizationId,
        id,
      );
      if (!archived) throw new DomainError("NOT_FOUND");
    },

    async createItem(actorInput, supplierId, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "supplier:write");

      await requireSupplier(actor.organizationId, supplierId);

      const item = (
        await deps.catalogRepository.listItemOptions(actor.organizationId)
      ).find((candidate) => candidate.id === input.itemId);
      if (!item) throw new DomainError("NOT_FOUND");

      const [stockUnit, packUnit] = await Promise.all([
        deps.catalogRepository.findUnit(item.stockUnitId),
        deps.catalogRepository.findUnit(input.packUnitId),
      ]);
      if (!stockUnit || !packUnit || stockUnit.kind !== packUnit.kind) {
        throw new DomainError("INVALID_UNIT");
      }

      try {
        const id = await deps.supplierRepository.createItem(
          actor.organizationId,
          supplierId,
          input,
        );
        const supplier = await deps.supplierRepository.findById(
          actor.organizationId,
          supplierId,
        );
        const created = supplier?.items.find((row) => row.id === id);
        if (!created) throw new DomainError("UNEXPECTED");
        return created;
      } catch (error) {
        mapUnique(error);
      }
    },

    async closeItem(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "supplier:write");

      const validTo = new Date();
      validTo.setUTCHours(0, 0, 0, 0);
      validTo.setUTCDate(validTo.getUTCDate() + 1);

      const closed = await deps.supplierRepository.closeItem(
        actor.organizationId,
        id,
        validTo,
      );
      if (!closed) throw new DomainError("NOT_FOUND");
    },
  };
}
