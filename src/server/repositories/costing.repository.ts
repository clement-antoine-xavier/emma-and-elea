import {prisma} from "@/lib/prisma";
import {DEFAULT_ORGANIZATION_SETTINGS} from "@/server/domain/organization-settings";
import {packPricePerStockUnit} from "@/server/domain/costing";
import {stockUnitCost} from "@/server/domain/receipt";
import type {UnitKindName} from "@/server/domain/units";

export type ResolvedItemPrice = {
  unitCostPerStockUnit: string;
  source: "SUPPLIER" | "RECEIPT";
};

export type CostingSettings = {
  currency: string;
  overheadPct: string;
  defaultLabourRateId: string | null;
};

export type CostingLabourRate = {
  id: string;
  label: string;
  hourlyCost: string;
  currency: string;
  siteId: string | null;
};

export type CostingEnergyTariff = {
  siteId: string;
  pricePerKwh: string;
  currency: string;
};

type UnitRow = {
  code: string;
  kind: string;
  factorToBase: {toString(): string};
  isBase: boolean;
};

function convertible(unit: UnitRow) {
  return {
    code: unit.code,
    kind: unit.kind as UnitKindName,
    factorToBase: unit.factorToBase.toString(),
    isBase: unit.isBase,
  };
}

export interface CostingRepository {
  getSettings(organizationId: string): Promise<CostingSettings>;
  getDefaultSiteId(organizationId: string): Promise<string | null>;
  resolvePrices(
    organizationId: string,
    itemIds: readonly string[],
    date: Date,
  ): Promise<Record<string, ResolvedItemPrice>>;
  resolveLabourRates(
    organizationId: string,
    date: Date,
  ): Promise<CostingLabourRate[]>;
  resolveEnergyTariffs(
    organizationId: string,
    date: Date,
  ): Promise<CostingEnergyTariff[]>;
}

const unitSelect = {
  code: true,
  kind: true,
  factorToBase: true,
  isBase: true,
} as const;

export const costingRepository: CostingRepository = {
  async getSettings(organizationId) {
    const settings = await prisma.organizationSetting.findUnique({
      where: {organizationId},
      select: {
        currency: true,
        overheadPct: true,
        defaultLabourRateId: true,
      },
    });

    if (!settings) return {...DEFAULT_ORGANIZATION_SETTINGS, defaultLabourRateId: null};

    return {
      currency: settings.currency,
      overheadPct: settings.overheadPct.toString(),
      defaultLabourRateId: settings.defaultLabourRateId,
    };
  },

  async getDefaultSiteId(organizationId) {
    const site = await prisma.site.findFirst({
      where: {organizationId, archivedAt: null},
      orderBy: {createdAt: "asc"},
      select: {id: true},
    });

    return site?.id ?? null;
  },

  async resolvePrices(organizationId, itemIds, date) {
    if (itemIds.length === 0) return {};

    const prices: Record<string, ResolvedItemPrice> = {};
    const supplierItems = await prisma.supplierItem.findMany({
      where: {
        organizationId,
        itemId: {in: [...itemIds]},
        archivedAt: null,
        validFrom: {lte: date},
        OR: [{validTo: null}, {validTo: {gt: date}}],
      },
      orderBy: [{isPreferred: "desc"}, {validFrom: "desc"}],
      select: {
        itemId: true,
        price: true,
        packQuantity: true,
        packUnit: {select: unitSelect},
        item: {select: {stockUnit: {select: unitSelect}}},
      },
    });

    for (const row of supplierItems) {
      if (prices[row.itemId]) continue;

      try {
        prices[row.itemId] = {
          unitCostPerStockUnit: packPricePerStockUnit(
            row.price.toString(),
            row.packQuantity.toString(),
            convertible(row.packUnit),
            convertible(row.item.stockUnit),
          ).toString(),
          source: "SUPPLIER",
        };
      } catch {
        // A pack unit of another kind cannot price this item; try the fallback.
      }
    }

    const missing = itemIds.filter((itemId) => !prices[itemId]);
    if (missing.length === 0) return prices;

    const receiptLines = await prisma.purchaseReceiptLine.findMany({
      where: {
        organizationId,
        itemId: {in: missing},
        purchaseReceipt: {status: "POSTED"},
      },
      orderBy: [{purchaseReceipt: {receivedAt: "desc"}}],
      select: {
        itemId: true,
        unitPrice: true,
        unit: {select: unitSelect},
        item: {select: {stockUnit: {select: unitSelect}}},
      },
    });

    for (const row of receiptLines) {
      if (prices[row.itemId]) continue;

      try {
        prices[row.itemId] = {
          unitCostPerStockUnit: stockUnitCost(
            row.unitPrice.toString(),
            convertible(row.unit),
            convertible(row.item.stockUnit),
          ).toString(),
          source: "RECEIPT",
        };
      } catch {
        // Ignore a malformed historical line; the warning still surfaces.
      }
    }

    return prices;
  },

  async resolveLabourRates(organizationId, date) {
    const rates = await prisma.labourRate.findMany({
      where: {
        organizationId,
        archivedAt: null,
        validFrom: {lte: date},
        OR: [{validTo: null}, {validTo: {gt: date}}],
      },
      orderBy: [{validFrom: "desc"}],
      select: {
        id: true,
        label: true,
        hourlyCost: true,
        currency: true,
        siteId: true,
      },
    });

    return rates.map((rate) => ({
      id: rate.id,
      label: rate.label,
      hourlyCost: rate.hourlyCost.toString(),
      currency: rate.currency,
      siteId: rate.siteId,
    }));
  },

  async resolveEnergyTariffs(organizationId, date) {
    const tariffs = await prisma.energyTariff.findMany({
      where: {
        organizationId,
        energyKind: "ELECTRICITY",
        validFrom: {lte: date},
        OR: [{validTo: null}, {validTo: {gt: date}}],
      },
      orderBy: [{validFrom: "desc"}],
      select: {
        siteId: true,
        pricePerKwh: true,
        currency: true,
      },
    });

    return tariffs.map((tariff) => ({
      siteId: tariff.siteId,
      pricePerKwh: tariff.pricePerKwh.toString(),
      currency: tariff.currency,
    }));
  },
};
