import {
  assertOrganizationActor,
  assertPermission,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {normalizePage} from "@/server/domain/pagination";
import type {
  LotDetailRecord,
  LotSummaryRecord,
  StockLevelRecord,
} from "@/lib/dto";
import type {Page} from "@/server/repositories/types";
import type {StockRepository} from "@/server/repositories/stock.repository";

export type StockFilters = {
  search?: string | string[];
  includeEmpty?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

export interface StockService {
  getLevels(actor: Actor | null): Promise<{
    levels: StockLevelRecord[];
    alerts: StockLevelRecord[];
  }>;
  getLots(
    actor: Actor | null,
    filters: StockFilters,
  ): Promise<{
    page: Page<LotSummaryRecord>;
    filters: {search: string; includeEmpty: boolean};
  }>;
  getLot(actor: Actor | null, id: string): Promise<LotDetailRecord | null>;
}

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function createStockService(deps: {
  stockRepository: StockRepository;
}): StockService {
  return {
    async getLevels(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "stock:read");

      const levels = await deps.stockRepository.listLevels(
        actor.organizationId,
      );

      return {
        levels,
        alerts: levels.filter((level) => level.isBelowMin),
      };
    },

    async getLots(actorInput, filters) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "stock:read");

      const window = normalizePage({
        page: single(filters.page),
        pageSize: single(filters.pageSize),
      });
      const search = single(filters.search);
      const includeEmpty = single(filters.includeEmpty) === "true";

      const result = await deps.stockRepository.listLots(
        actor.organizationId,
        {
          search,
          includeEmpty,
          skip: window.skip,
          take: window.take,
        },
      );

      return {
        page: {
          items: result.lots,
          total: result.total,
          page: window.page,
          pageSize: window.pageSize,
        },
        filters: {search, includeEmpty},
      };
    },

    async getLot(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "stock:read");

      return deps.stockRepository.findLot(actor.organizationId, id);
    },
  };
}
