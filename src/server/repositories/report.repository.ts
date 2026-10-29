import {Decimal} from "@prisma/client/runtime/client";
import {prisma} from "@/lib/prisma";
import type {
  BatchYieldRecord,
  ProductMarginRecord,
  ReportsSummary,
} from "@/lib/dto";

export interface ReportRepository {
  productMargins(organizationId: string): Promise<ProductMarginRecord[]>;
  batchYields(organizationId: string): Promise<BatchYieldRecord[]>;
  summary(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<Omit<ReportsSummary, "currency" | "from" | "to"> & {currency: string}>;
  kpis(organizationId: string, from: Date, to: Date): Promise<{
    batchesToday: number;
    expiringLotsCount: number;
    wasteCost: string;
    currency: string;
  }>;
}

export const reportRepository: ReportRepository = {
  async productMargins(organizationId) {
    const recipes = await prisma.recipe.findMany({
      where: {organizationId, archivedAt: null, currentVersionId: {not: null}},
      orderBy: {name: "asc"},
      select: {
        id: true,
        name: true,
        outputItem: {
          select: {
            name: true,
            salePrice: true,
            category: {select: {name: true}},
          },
        },
        currentVersion: {
          select: {
            costSnapshots: {
              orderBy: {computedAt: "desc"},
              take: 1,
              select: {
                costPerUnit: true,
                marginPct: true,
                currency: true,
                computedAt: true,
              },
            },
          },
        },
      },
    });

    return recipes.flatMap((recipe) => {
      const snapshot = recipe.currentVersion?.costSnapshots[0];
      if (!snapshot) return [];

      const salePrice = recipe.outputItem.salePrice;
      const marginPct =
        salePrice && salePrice.greaterThan(0)
          ? salePrice
              .minus(snapshot.costPerUnit)
              .div(salePrice)
              .mul(100)
              .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
              .toString()
          : null;

      return [
        {
          recipeId: recipe.id,
          recipeName: recipe.name,
          outputItemName: recipe.outputItem.name,
          categoryName: recipe.outputItem.category?.name ?? null,
          costPerUnit: snapshot.costPerUnit.toString(),
          salePrice: salePrice?.toString() ?? null,
          marginPct,
          currency: snapshot.currency,
          computedAt: snapshot.computedAt,
        },
      ];
    });
  },

  async batchYields(organizationId) {
    const batches = await prisma.productionBatch.findMany({
      where: {
        organizationId,
        status: "COMPLETED",
        actualQuantity: {not: null},
      },
      orderBy: {completedAt: "desc"},
      take: 50,
      select: {
        id: true,
        code: true,
        plannedQuantity: true,
        actualQuantity: true,
        unit: {select: {code: true}},
        producedOn: true,
        recipeVersion: {select: {recipe: {select: {name: true}}}},
      },
    });

    return batches.map((batch) => {
      const yieldPct =
        Number(batch.plannedQuantity.toString()) > 0
          ? (Number(batch.actualQuantity!.toString()) /
              Number(batch.plannedQuantity.toString())) *
            100
          : 0;

      return {
        id: batch.id,
        code: batch.code,
        recipeName: batch.recipeVersion.recipe.name,
        plannedQuantity: batch.plannedQuantity.toString(),
        actualQuantity: batch.actualQuantity!.toString(),
        unitCode: batch.unit.code,
        yieldPct: yieldPct.toFixed(2),
        producedOn: batch.producedOn,
      };
    });
  },

  async summary(organizationId, from, to) {
    const [waste, production] = await Promise.all([
      prisma.wasteRecord.aggregate({
        where: {
          organizationId,
          archivedAt: null,
          recordedAt: {gte: from, lte: to},
        },
        _sum: {costImpact: true},
      }),
      prisma.costSnapshot.aggregate({
        where: {
          organizationId,
          scope: "PRODUCTION_BATCH",
          computedAt: {gte: from, lte: to},
        },
        _sum: {totalCost: true},
      }),
    ]);

    const wasteCost = new Decimal(
      waste._sum.costImpact?.toString() ?? "0",
    );
    const productionCost = new Decimal(
      production._sum.totalCost?.toString() ?? "0",
    );
    const denominator = wasteCost.plus(productionCost);
    const rate = denominator.isZero()
      ? new Decimal(0)
      : wasteCost.div(denominator).mul(100);
    const settings = await prisma.organizationSetting.findUnique({
      where: {organizationId},
      select: {currency: true},
    });

    return {
      wasteCost: wasteCost.toString(),
      productionCost: productionCost.toString(),
      wasteRatePct: rate
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toString(),
      currency: settings?.currency ?? "EUR",
    };
  },

  async kpis(organizationId, from, to) {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const expiryLimit = new Date(dayStart);
    expiryLimit.setUTCDate(expiryLimit.getUTCDate() + 7);

    const [batchesToday, expiring, waste, settings] = await Promise.all([
      prisma.productionBatch.count({
        where: {
          organizationId,
          status: "COMPLETED",
          completedAt: {gte: dayStart, lt: dayEnd},
        },
      }),
      prisma.lot.count({
        where: {
          organizationId,
          status: "AVAILABLE",
          quantityRemaining: {gt: 0},
          expiresOn: {not: null, lte: expiryLimit},
        },
      }),
      prisma.wasteRecord.aggregate({
        where: {
          organizationId,
          archivedAt: null,
          recordedAt: {gte: from, lte: to},
        },
        _sum: {costImpact: true},
      }),
      prisma.organizationSetting.findUnique({
        where: {organizationId},
        select: {currency: true},
      }),
    ]);

    return {
      batchesToday,
      expiringLotsCount: expiring,
      wasteCost: waste._sum.costImpact?.toString() ?? "0",
      currency: settings?.currency ?? "EUR",
    };
  },
};
