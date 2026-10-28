
import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import {normalizePage} from "@/server/domain/pagination";
import type {
  OrderDetailRecord,
  OrderStatusName,
  OrderSummaryRecord,
} from "@/lib/dto";
import type {Page} from "@/server/repositories/types";
import type {
  OrderLineInput,
  OrderRepository,
} from "@/server/repositories/order.repository";
import type {CustomerRepository} from "@/server/repositories/customer.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {CostingRepository} from "@/server/repositories/costing.repository";

export type OrderFiltersInput = {
  search?: string | string[];
  status?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

export type OrderOptions = {
  customers: {id: string; name: string; code: string | null}[];
  sites: {id: string; name: string; code: string}[];
  items: {id: string; code: string; name: string; stockUnitId: string}[];
  units: {id: string; code: string; labelEn: string; labelFr: string}[];
};

export interface OrderService {
  getOrders(
    actor: Actor | null,
    filters: OrderFiltersInput,
  ): Promise<{
    page: Page<OrderSummaryRecord>;
    canWrite: boolean;
    filters: {search: string; status: OrderStatusName | null};
  }>;
  getOrder(
    actor: Actor | null,
    id: string,
  ): Promise<{order: OrderDetailRecord; canWrite: boolean} | null>;
  getOptions(actor: Actor | null): Promise<OrderOptions>;
  createOrder(
    actor: Actor | null,
    input: {customerId: string; siteId: string; requestedFor: Date; note: string | null},
  ): Promise<{id: string}>;
  addLine(
    actor: Actor | null,
    orderId: string,
    input: OrderLineInput,
  ): Promise<void>;
  removeLine(
    actor: Actor | null,
    orderId: string,
    lineId: string,
  ): Promise<void>;
  confirmOrder(actor: Actor | null, id: string): Promise<void>;
  cancelOrder(actor: Actor | null, id: string): Promise<void>;
}

const STATUSES: readonly OrderStatusName[] = [
  "DRAFT",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function isStatus(value: string): value is OrderStatusName {
  return (STATUSES as readonly string[]).includes(value);
}

export function createOrderService(deps: {
  orderRepository: OrderRepository;
  customerRepository: CustomerRepository;
  siteRepository: SiteRepository;
  catalogRepository: CatalogRepository;
  costingRepository: CostingRepository;
}): OrderService {
  return {
    async getOrders(actorInput, filters) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "order:read");

      const window = normalizePage({
        page: single(filters.page),
        pageSize: single(filters.pageSize),
      });
      const search = single(filters.search);
      const statusValue = single(filters.status);
      const status = isStatus(statusValue) ? statusValue : null;
      const result = await deps.orderRepository.list(actor.organizationId, {
        search,
        status,
        skip: window.skip,
        take: window.take,
      });

      return {
        page: {
          items: result.orders,
          total: result.total,
          page: window.page,
          pageSize: window.pageSize,
        },
        canWrite: isGranted(actor, "order:write"),
        filters: {search, status},
      };
    },

    async getOrder(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "order:read");

      const order = await deps.orderRepository.find(actor.organizationId, id);
      if (!order) return null;

      return {
        order,
        canWrite: isGranted(actor, "order:write"),
      };
    },

    async getOptions(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "order:read");

      const [customers, sites, items, units] = await Promise.all([
        deps.customerRepository.list(actor.organizationId),
        deps.siteRepository.list(actor.organizationId),
        deps.catalogRepository.listItemOptions(actor.organizationId),
        deps.catalogRepository.listUnits(),
      ]);

      return {
        customers: customers
          .filter((customer) => !customer.isArchived)
          .map((customer) => ({
            id: customer.id,
            name: customer.name,
            code: customer.code,
          })),
        sites: sites
          .filter((site) => !site.archivedAt)
          .map((site) => ({id: site.id, name: site.name, code: site.code})),
        items: items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          stockUnitId: item.stockUnitId,
        })),
        units: units.map((unit) => ({
          id: unit.id,
          code: unit.code,
          labelEn: unit.labelEn,
          labelFr: unit.labelFr,
        })),
      };
    },

    async createOrder(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "order:write");

      const [customer, site, settings] = await Promise.all([
        deps.customerRepository.find(actor.organizationId, input.customerId),
        deps.siteRepository.findById(actor.organizationId, input.siteId),
        deps.costingRepository.getSettings(actor.organizationId),
      ]);
      if (!customer || !site) throw new DomainError("NOT_FOUND");

      return {
        id: await deps.orderRepository.create(actor.organizationId, {
          customerId: input.customerId,
          siteId: input.siteId,
          requestedFor: input.requestedFor,
          currency: settings.currency,
          note: input.note,
        }),
      };
    },

    async addLine(actorInput, orderId, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "order:write");

      const order = await deps.orderRepository.findSummary(
        actor.organizationId,
        orderId,
      );
      if (!order) throw new DomainError("NOT_FOUND");

      const item = (
        await deps.catalogRepository.listItemOptions(actor.organizationId)
      ).find((candidate) => candidate.id === input.itemId);
      if (!item) throw new DomainError("NOT_FOUND");

      const [unit, stockUnit] = await Promise.all([
        deps.catalogRepository.findUnit(input.unitId),
        deps.catalogRepository.findUnit(item.stockUnitId),
      ]);
      if (!unit || !stockUnit || unit.kind !== stockUnit.kind) {
        throw new DomainError("INVALID_UNIT");
      }

      await deps.orderRepository.addLine(
        actor.organizationId,
        orderId,
        input,
      );
    },

    async removeLine(actorInput, orderId, lineId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "order:write");

      await deps.orderRepository.removeLine(
        actor.organizationId,
        orderId,
        lineId,
      );
    },

    async confirmOrder(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "order:write");

      const order = await deps.orderRepository.find(actor.organizationId, id);
      if (!order) throw new DomainError("NOT_FOUND");
      if (order.status !== "DRAFT" || order.lines.length === 0) {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      await deps.orderRepository.confirm(actor.organizationId, id);
    },

    async cancelOrder(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "order:write");

      await deps.orderRepository.cancel(actor.organizationId, id);
    },
  };
}
