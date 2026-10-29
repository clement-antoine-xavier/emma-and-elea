import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {normalizePage} from "@/server/domain/pagination";
import {suggestedOrderQuantity} from "@/server/domain/replenishment";
import type {
  LotDetailRecord,
  LotSummaryRecord,
  ReplenishmentSuggestionRecord,
  StockLevelRecord,
} from "@/lib/dto";
import type {Page} from "@/server/repositories/types";
import type {SupplierRepository} from "@/server/repositories/supplier.repository";
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
  getReplenishment(actor: Actor | null): Promise<{
    suggestions: ReplenishmentSuggestionRecord[];
    canWrite: boolean;
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
  supplierRepository: SupplierRepository;
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

    async getReplenishment(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "stock:read");

      const [levels, openDrafts] = await Promise.all([
        deps.stockRepository.listLevels(actor.organizationId),
        deps.stockRepository.openDraftQuantities(actor.organizationId),
      ]);

      const candidates = levels.flatMap((level) => {
        const suggested = suggestedOrderQuantity({
          onHand: level.quantity,
          openDraftQuantity:
            openDrafts[`${level.siteId}:${level.itemId}`] ?? "0",
          minStockQuantity: level.minStockQuantity,
          parLevelQuantity: level.parLevelQuantity,
        });
        if (!suggested || suggested.isZero()) return [];

        return [
          {
            level,
            openDraftQuantity:
              openDrafts[`${level.siteId}:${level.itemId}`] ?? "0",
            suggestedQuantity: suggested.toString(),
          },
        ];
      });

      const prices = await deps.supplierRepository.preferredPrices(
        actor.organizationId,
        [...new Set(candidates.map((row) => row.level.itemId))],
        new Date(),
      );

      const suggestions: ReplenishmentSuggestionRecord[] = candidates.map(
        ({level, openDraftQuantity, suggestedQuantity}) => {
          const price = prices[level.itemId];
          return {
            itemId: level.itemId,
            itemCode: level.itemCode,
            itemName: level.itemName,
            siteId: level.siteId,
            siteName: level.siteName,
            unitId: level.unitId,
            unitCode: level.unitCode,
            onHand: level.quantity,
            openDraftQuantity,
            minStockQuantity: level.minStockQuantity,
            parLevelQuantity: level.parLevelQuantity,
            suggestedQuantity,
            supplierId: price?.supplierId ?? null,
            supplierName: price?.supplierName ?? null,
            unitPrice: price?.unitCostPerStockUnit ?? null,
            currency: price?.currency ?? "EUR",
          };
        },
      );

      return {
        suggestions,
        canWrite: isGranted(actor, "purchasing:write"),
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
