import {
  assertOrganizationActor,
  assertPermission,
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

export interface ReportService {
  getReports(actor: Actor | null): Promise<{
    margins: ProductMarginRecord[];
    yields: BatchYieldRecord[];
    summary: ReportsSummary;
    alerts: StockLevelRecord[];
  }>;
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

      const to = new Date();
      to.setUTCHours(23, 59, 59, 999);
      const from = new Date(to);
      from.setUTCDate(from.getUTCDate() - 30);

      const [margins, yields, summary, levels] = await Promise.all([
        deps.reportRepository.productMargins(actor.organizationId),
        deps.reportRepository.batchYields(actor.organizationId),
        deps.reportRepository.summary(actor.organizationId, from, to),
        deps.stockRepository.listLevels(actor.organizationId),
      ]);

      return {
        margins,
        yields,
        summary: {...summary, from, to},
        alerts: levels.filter((level) => level.isBelowMin),
      };
    },

    async getKpis(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "report:read");

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
        wasteCost30d: kpis.wasteCost,
        currency: kpis.currency,
      };
    },
  };
}
