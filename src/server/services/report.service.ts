import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import type {
  BatchYieldRecord,
  CategoryProfitabilityRecord,
  DashboardKpis,
  ProductMarginRecord,
  ProductProfitabilityRecord,
  ReportsSummary,
  StockLevelRecord,
} from "@/lib/dto";
import type {ProfitabilitySort} from "@/lib/profitability";
import {
  categoryProfitability,
  productProfitability,
  sortProfitability,
} from "@/server/domain/profitability";
import type {ProfitabilityRepository} from "@/server/repositories/profitability.repository";
import type {ReportRepository} from "@/server/repositories/report.repository";
import type {StockRepository} from "@/server/repositories/stock.repository";

export type ReportsView = {
  from: Date;
  to: Date;
  /**
   * Cost and margin data. `null` when the member lacks `report:finance`; the
   * page then renders the operational report instead.
   */
  summary: ReportsSummary | null;
  margins: ProductMarginRecord[];
  profitability: ProductProfitabilityRecord[];
  categoryProfitability: CategoryProfitabilityRecord[];
  sort: ProfitabilitySort;
  yields: BatchYieldRecord[];
  alerts: StockLevelRecord[];
  can: {
    finance: boolean;
    production: boolean;
    stock: boolean;
  };
};

export interface ReportService {
  getReports(
    actor: Actor | null,
    options?: {sort?: ProfitabilitySort; period?: number},
  ): Promise<ReportsView>;
  getKpis(actor: Actor | null): Promise<DashboardKpis>;
}

export function createReportService(deps: {
  reportRepository: ReportRepository;
  stockRepository: StockRepository;
  profitabilityRepository: ProfitabilityRepository;
}): ReportService {
  return {
    async getReports(actorInput, options) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "report:read");

      const canFinance = isGranted(actor, "report:finance");
      const canProduction = isGranted(actor, "production:read");
      const canStock = isGranted(actor, "stock:read");

      const period = [7, 30, 90].includes(options?.period ?? 0)
        ? (options?.period as number)
        : 30;
      const to = new Date();
      to.setUTCHours(23, 59, 59, 999);
      const from = new Date(to);
      from.setUTCDate(from.getUTCDate() - period);

      const [margins, yields, summary, levels, profitabilityData] =
        await Promise.all([
          canFinance
            ? deps.reportRepository.productMargins(actor.organizationId)
            : Promise.resolve([] as ProductMarginRecord[]),
          canProduction
            ? deps.reportRepository.batchYields(actor.organizationId)
            : Promise.resolve([] as BatchYieldRecord[]),
          canFinance
            ? deps.reportRepository.summary(actor.organizationId, from, to)
            : Promise.resolve(null),
          canStock
            ? deps.stockRepository.listLevels(actor.organizationId)
            : Promise.resolve([] as StockLevelRecord[]),
          canFinance
            ? deps.profitabilityRepository.getData(
                actor.organizationId,
                from,
                to,
              )
            : Promise.resolve(null),
        ]);

      const sort = options?.sort ?? "contribution";
      const profitability = profitabilityData
        ? sortProfitability(
            profitabilityData.items
              .map((item) => {
                const metric = profitabilityData.metrics[item.itemId];
                if (!metric) return null;
                const hasActivity =
                  Number(metric.produced) !== 0 ||
                  Number(metric.sold) !== 0 ||
                  Number(metric.waste) !== 0;
                return hasActivity ? productProfitability(item, metric) : null;
              })
              .filter(
                (record): record is ProductProfitabilityRecord =>
                  record !== null,
              ),
            sort,
          )
        : [];

      return {
        from,
        to,
        summary: summary ? {...summary, from, to} : null,
        margins,
        profitability,
        categoryProfitability: categoryProfitability(profitability),
        sort,
        yields,
        alerts: levels.filter((level) => level.isBelowMin),
        can: {
          finance: canFinance,
          production: canProduction,
          stock: canStock,
        },
      };
    },

    async getKpis(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "report:read");

      const canFinance = isGranted(actor, "report:finance");

      const to = new Date();
      to.setUTCHours(23, 59, 59, 999);
      const from = new Date(to);
      from.setUTCDate(from.getUTCDate() - 30);

      const [kpis, levels] = await Promise.all([
        deps.reportRepository.kpis(actor.organizationId, from, to),
        deps.stockRepository.listLevels(actor.organizationId),
      ]);

      return {
        batchesToday: kpis.batchesToday,
        lowStockCount: levels.filter((level) => level.isBelowMin).length,
        expiringLotsCount: kpis.expiringLotsCount,
        wasteCost30d: canFinance ? kpis.wasteCost : null,
        currency: kpis.currency,
      };
    },
  };
}
