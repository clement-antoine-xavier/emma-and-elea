import {can} from "@/lib/permissions";
import {
  assertOrganizationActor,
  assertPermission,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import {normalizePage} from "@/server/domain/pagination";
import type {
  DispatchDetailRecord,
  DispatchStatusName,
  DispatchSummaryRecord,
} from "@/lib/dto";
import type {Page} from "@/server/repositories/types";
import type {
  DispatchRepository,
} from "@/server/repositories/dispatch.repository";
import type {CustomerRepository} from "@/server/repositories/customer.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {OrderRepository} from "@/server/repositories/order.repository";

export type DispatchFiltersInput = {
  search?: string | string[];
  status?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

export interface DispatchService {
  getDispatches(
    actor: Actor | null,
    filters: DispatchFiltersInput,
  ): Promise<{
    page: Page<DispatchSummaryRecord>;
    canWrite: boolean;
    filters: {search: string; status: DispatchStatusName | null};
  }>;
  getDispatch(
    actor: Actor | null,
    id: string,
  ): Promise<{dispatch: DispatchDetailRecord; canWrite: boolean} | null>;
  getOptions(actor: Actor | null): Promise<
    Awaited<ReturnType<DispatchRepository["options"]>>
  >;
  createDispatch(
    actor: Actor | null,
    input: {
      siteId: string;
      customerId: string | null;
      orderId: string | null;
      carrier: string | null;
      note: string | null;
    },
  ): Promise<{id: string}>;
  addLine(
    actor: Actor | null,
    dispatchId: string,
    input: {
      lotId: string;
      quantity: string;
      unitPrice: string | null;
      note: string | null;
    },
  ): Promise<void>;
  removeLine(
    actor: Actor | null,
    dispatchId: string,
    lineId: string,
  ): Promise<void>;
  postDispatch(actor: Actor | null, id: string): Promise<void>;
  cancelDispatch(actor: Actor | null, id: string): Promise<void>;
}

const STATUSES: readonly DispatchStatusName[] = [
  "DRAFT",
  "DISPATCHED",
  "CANCELLED",
];

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function isStatus(value: string): value is DispatchStatusName {
  return (STATUSES as readonly string[]).includes(value);
}

export function createDispatchService(deps: {
  dispatchRepository: DispatchRepository;
  customerRepository: CustomerRepository;
  siteRepository: SiteRepository;
  orderRepository: OrderRepository;
}): DispatchService {
  return {
    async getDispatches(actorInput, filters) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "dispatch:read");

      const window = normalizePage({
        page: single(filters.page),
        pageSize: single(filters.pageSize),
      });
      const search = single(filters.search);
      const statusValue = single(filters.status);
      const status = isStatus(statusValue) ? statusValue : null;
      const result = await deps.dispatchRepository.list(
        actor.organizationId,
        {search, status, skip: window.skip, take: window.take},
      );

      return {
        page: {
          items: result.dispatches,
          total: result.total,
          page: window.page,
          pageSize: window.pageSize,
        },
        canWrite: can(actor.role, "dispatch:write"),
        filters: {search, status},
      };
    },

    async getDispatch(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "dispatch:read");

      const dispatch = await deps.dispatchRepository.find(
        actor.organizationId,
        id,
      );
      if (!dispatch) return null;

      return {
        dispatch,
        canWrite: can(actor.role, "dispatch:write"),
      };
    },

    async getOptions(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "dispatch:read");

      return deps.dispatchRepository.options(actor.organizationId);
    },

    async createDispatch(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "dispatch:write");

      const site = await deps.siteRepository.findById(
        actor.organizationId,
        input.siteId,
      );
      if (!site) throw new DomainError("NOT_FOUND");

      let customerId = input.customerId;

      if (input.orderId) {
        const order = await deps.orderRepository.findSummary(
          actor.organizationId,
          input.orderId,
        );
        if (!order) throw new DomainError("NOT_FOUND");
        if (!["CONFIRMED", "IN_PRODUCTION", "READY"].includes(order.status)) {
          throw new DomainError("INVALID_STATE_TRANSITION");
        }
        if (input.customerId && input.customerId !== order.customerId) {
          throw new DomainError("INVALID_INPUT");
        }
        customerId = order.customerId;
      }

      if (customerId) {
        const customer = await deps.customerRepository.find(
          actor.organizationId,
          customerId,
        );
        if (!customer) throw new DomainError("NOT_FOUND");
      }

      return {
        id: await deps.dispatchRepository.create(actor.organizationId, {
          ...input,
          customerId,
        }),
      };
    },

    async addLine(actorInput, dispatchId, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "dispatch:write");

      const [dispatch, lot] = await Promise.all([
        deps.dispatchRepository.find(actor.organizationId, dispatchId),
        deps.dispatchRepository.findLot(actor.organizationId, input.lotId),
      ]);

      if (!dispatch) throw new DomainError("NOT_FOUND");
      if (!lot) throw new DomainError("NOT_FOUND");
      if (lot.siteId !== dispatch.siteId) {
        throw new DomainError("INVALID_INPUT");
      }
      if (Number(input.quantity) > Number(lot.quantityRemaining)) {
        throw new DomainError("INSUFFICIENT_STOCK");
      }

      await deps.dispatchRepository.addLine(
        actor.organizationId,
        dispatchId,
        {
          lotId: lot.id,
          itemId: lot.itemId,
          unitId: lot.unitId,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          note: input.note,
        },
      );
    },

    async removeLine(actorInput, dispatchId, lineId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "dispatch:write");

      await deps.dispatchRepository.removeLine(
        actor.organizationId,
        dispatchId,
        lineId,
      );
    },

    async postDispatch(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "dispatch:write");

      await deps.dispatchRepository.post(actor.organizationId, id);
    },

    async cancelDispatch(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "dispatch:write");

      await deps.dispatchRepository.cancel(actor.organizationId, id);
    },
  };
}
