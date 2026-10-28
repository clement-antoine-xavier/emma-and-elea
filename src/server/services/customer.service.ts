
import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import type {CustomerRecord} from "@/lib/dto";
import type {
  CustomerInput,
  CustomerRepository,
} from "@/server/repositories/customer.repository";

export interface CustomerService {
  getCustomers(actor: Actor | null): Promise<{
    customers: CustomerRecord[];
    canWrite: boolean;
  }>;
  getCustomer(
    actor: Actor | null,
    id: string,
  ): Promise<{customer: CustomerRecord; canWrite: boolean} | null>;
  createCustomer(
    actor: Actor | null,
    input: CustomerInput,
  ): Promise<{id: string}>;
  updateCustomer(
    actor: Actor | null,
    id: string,
    input: CustomerInput,
  ): Promise<void>;
  archiveCustomer(actor: Actor | null, id: string): Promise<void>;
}

export function createCustomerService(deps: {
  customerRepository: CustomerRepository;
}): CustomerService {
  return {
    async getCustomers(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "customer:read");

      return {
        customers: await deps.customerRepository.list(actor.organizationId),
        canWrite: isGranted(actor, "customer:write"),
      };
    },

    async getCustomer(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "customer:read");

      const customer = await deps.customerRepository.find(
        actor.organizationId,
        id,
      );
      if (!customer) return null;

      return {
        customer,
        canWrite: isGranted(actor, "customer:write"),
      };
    },

    async createCustomer(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "customer:write");

      return {
        id: await deps.customerRepository.create(actor.organizationId, input),
      };
    },

    async updateCustomer(actorInput, id, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "customer:write");

      const existing = await deps.customerRepository.find(
        actor.organizationId,
        id,
      );
      if (!existing) throw new DomainError("NOT_FOUND");

      const updated = await deps.customerRepository.update(
        actor.organizationId,
        id,
        input,
      );
      if (!updated) throw new DomainError("NOT_FOUND");
    },

    async archiveCustomer(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "customer:write");

      const archived = await deps.customerRepository.archive(
        actor.organizationId,
        id,
      );
      if (!archived) throw new DomainError("NOT_FOUND");
    },
  };
}
