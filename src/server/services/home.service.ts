import {
  assertOrganizationActor,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import type {
  HomeCapabilities,
  HomeData,
  HomePeriod,
} from "@/lib/dto";
import type {DailySalesService} from "./daily-sales.service";
import type {OrderService} from "./order.service";
import type {ProductionService} from "./production.service";
import type {ReportService} from "./report.service";
import type {StockService} from "./stock.service";

const PERIODS: readonly HomePeriod[] = [7, 30, 90];

export function normalizePeriod(
  value: string | string[] | undefined,
): HomePeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  return PERIODS.includes(parsed as HomePeriod)
    ? (parsed as HomePeriod)
    : 30;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function range(period: HomePeriod): {from: Date; to: Date} {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (period - 1));
  from.setUTCHours(0, 0, 0, 0);

  return {from, to};
}

function previousRange(from: Date, to: Date): {from: Date; to: Date} {
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setUTCDate(previousTo.getUTCDate() - (days - 1));
  previousFrom.setUTCHours(0, 0, 0, 0);

  return {from: previousFrom, to: previousTo};
}

/** A continuous, zero-filled day axis so charts never skip a date. */
function daysBetween(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= to) {
    days.push(isoDay(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function sumRevenue(rows: ReadonlyArray<{revenue: string}>): number {
  return rows.reduce((total, row) => total + Number(row.revenue), 0);
}

function todayIso(): string {
  return isoDay(new Date());
}

export interface HomeService {
  getHome(actor: Actor | null, period: HomePeriod): Promise<HomeData>;
}

export function createHomeService(deps: {
  reportService: ReportService;
  dailySalesService: DailySalesService;
  productionService: ProductionService;
  orderService: OrderService;
  stockService: StockService;
}): HomeService {
  return {
    async getHome(actorInput, period) {
      const actor = assertOrganizationActor(actorInput);
      const can: HomeCapabilities = {
        sales: isGranted(actor, "sales:read"),
        orders: isGranted(actor, "order:read"),
        production: isGranted(actor, "production:read"),
        productionWrite: isGranted(actor, "production:write"),
        stock: isGranted(actor, "stock:read"),
        reports: isGranted(actor, "report:read"),
        finance: isGranted(actor, "report:finance"),
      };

      const {from, to} = range(period);
      const previous = previousRange(from, to);

      const [kpis, sales, previousSales, batches, orders, levels] =
        await Promise.all([
          can.reports ? deps.reportService.getKpis(actor) : null,
          can.sales
            ? deps.dailySalesService.getDailySales(actor, {
                from: isoDay(from),
                to: isoDay(to),
              })
            : null,
          can.sales
            ? deps.dailySalesService.getDailySales(actor, {
                from: isoDay(previous.from),
                to: isoDay(previous.to),
              })
            : null,
          can.production ? deps.productionService.getBatches(actor) : null,
          can.orders
            ? deps.orderService.getOrders(actor, {pageSize: "6"})
            : null,
          can.stock ? deps.stockService.getLevels(actor) : null,
        ]);

      const alertRows = levels?.alerts ?? [];
      const batchRows = batches?.batches ?? [];
      const revenue = sumRevenue(sales?.rows ?? []);
      const previousRevenue = sumRevenue(previousSales?.rows ?? []);

      const days = daysBetween(from, to);
      const salesByDay = new Map(
        days.map((date) => [date, {date, revenue: 0, quantity: 0}]),
      );
      for (const row of sales?.rows ?? []) {
        const key = isoDay(row.businessDate);
        const point = salesByDay.get(key);
        if (!point) continue;
        point.revenue += Number(row.revenue);
        point.quantity += Number(row.quantitySold);
      }

      const productionByDay = new Map(
        days.map((date) => [date, {date, completed: 0}]),
      );
      const today = todayIso();
      let batchesToday = 0;
      for (const batch of batchRows) {
        if (batch.status !== "COMPLETED" || !batch.producedOn) continue;
        const key = isoDay(batch.producedOn);
        if (key === today) batchesToday += 1;
        const point = productionByDay.get(key);
        if (point) point.completed += 1;
      }

      return {
        period,
        from,
        to,
        currency: kpis?.currency ?? "EUR",
        kpis: {
          batchesToday: kpis?.batchesToday ?? batchesToday,
          plannedBatches: batchRows.filter((batch) => batch.status === "PLANNED")
            .length,
          lowStockCount: levels ? alertRows.length : (kpis?.lowStockCount ?? 0),
          expiringLotsCount: kpis?.expiringLotsCount ?? 0,
          revenue,
          revenueDeltaPct:
            previousRevenue > 0
              ? Math.round(((revenue - previousRevenue) / previousRevenue) * 1000) /
                10
              : null,
          orderCount: orders?.page.total ?? 0,
          wasteCost: kpis?.wasteCost30d ?? null,
        },
        salesTrend: [...salesByDay.values()],
        productionTrend: [...productionByDay.values()],
        alerts: alertRows,
        upcomingBatches: batchRows
          .filter((batch) => batch.status === "PLANNED")
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5),
        recentOrders: orders?.page.items ?? [],
        can,
      };
    },
  };
}
