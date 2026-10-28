
import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import type {DailySalesRecord} from "@/lib/dto";
import type {SalesRepository} from "@/server/repositories/sales.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";
import type {CostingRepository} from "@/server/repositories/costing.repository";

export type DailySalesFilters = {
  from?: string | string[];
  to?: string | string[];
  siteId?: string | string[];
};

export type DailySalesInput = {
  siteId: string;
  itemId: string;
  businessDate: Date;
  channel: "RETAIL" | "WHOLESALE" | "BOTH" | "NONE";
  quantitySold: string;
  revenue: string;
  note: string | null;
};

export interface DailySalesService {
  getDailySales(
    actor: Actor | null,
    filters: DailySalesFilters,
  ): Promise<{rows: DailySalesRecord[]; from: Date; to: Date; canWrite: boolean}>;
  getOptions(actor: Actor | null): Promise<{
    sites: {id: string; name: string; code: string}[];
    items: {id: string; code: string; name: string}[];
  }>;
  recordDailySales(actor: Actor | null, input: DailySalesInput): Promise<void>;
}

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function parseDate(value: string, fallback: Date): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export function createDailySalesService(deps: {
  salesRepository: SalesRepository;
  catalogRepository: CatalogRepository;
  siteRepository: SiteRepository;
  costingRepository: CostingRepository;
}): DailySalesService {
  return {
    async getDailySales(actorInput, filters) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "sales:read");

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const defaultFrom = new Date(today);
      defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);

      const from = parseDate(single(filters.from), defaultFrom);
      const to = parseDate(single(filters.to), today);
      const siteId = single(filters.siteId) || null;

      const rows = await deps.salesRepository.list(actor.organizationId, {
        from,
        to,
        siteId,
      });

      return {
        rows,
        from,
        to,
        canWrite: isGranted(actor, "sales:write"),
      };
    },

    async getOptions(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "sales:read");

      const [sites, items] = await Promise.all([
        deps.siteRepository.list(actor.organizationId),
        deps.catalogRepository.listItemOptions(actor.organizationId),
      ]);

      return {
        sites: sites
          .filter((site) => !site.archivedAt)
          .map((site) => ({id: site.id, name: site.name, code: site.code})),
        items: items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
        })),
      };
    },

    async recordDailySales(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "sales:write");

      const [site, item, settings] = await Promise.all([
        deps.siteRepository.findById(actor.organizationId, input.siteId),
        deps.catalogRepository.listItemOptions(actor.organizationId),
        deps.costingRepository.getSettings(actor.organizationId),
      ]);

      if (!site) throw new DomainError("NOT_FOUND");
      const selected = item.find((candidate) => candidate.id === input.itemId);
      if (!selected) throw new DomainError("NOT_FOUND");

      await deps.salesRepository.upsert(actor.organizationId, {
        siteId: input.siteId,
        itemId: input.itemId,
        businessDate: input.businessDate,
        channel: input.channel,
        quantitySold: input.quantitySold,
        revenue: input.revenue,
        currency: settings.currency,
        unitId: selected.stockUnitId,
        note: input.note,
      });
    },
  };
}
