import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import type {
  BatchYieldRecord,
  DashboardKpis,
  ProductMarginRecord,
  ReportsSummary,
  StockLevelRecord,
} from "@/lib/dto";
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
  yields: BatchYieldRecord[];
  alerts: StockLevelRecord[];
  can: {
    finance: boolean;
    production: boolean;
    stock: boolean;
  };
};

export interface ReportService {
  getReports(actor: Actor | null): Promise<ReportsView>;
  getKpis(actor: Actor | null): Promise<DashboardKpis>;
}

export function createReportService(deps: {
  reportRepository: ReportRepository;
  stockRepository: StockRepository;
}): ReportService {
  return {
    async getReports(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "report:read");

      const canFinance = isGranted(actor, "report:finance");
      const canProduction = isGranted(actor, "production:read");
      const canStock = isGranted(actor, "stock:read");

      const to = new Date();
      to.setUTCHours(23, 59, 59, 999);
      const from = new Date(to);
      from.setUTCDate(from.getUTCDate() - 30);

      const [margins, yields, summary, levels] = await Promise.all([
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
      ]);

      return {
        from,
        to,
        summary: summary ? {...summary, from, to} : null,
        margins,
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
