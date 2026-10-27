import {prisma} from "@/lib/prisma";
import type {
  EnergyTariffRecord,
  LabourRateRecord,
} from "./types";
import type {EnergyKind} from "@/server/validators/rate.schema";

export type LabourRateInput = {
  label: string;
  hourlyCost: string;
  siteId: string | null;
  validFrom: Date;
};

export type EnergyTariffInput = {
  siteId: string;
  energyKind: EnergyKind;
  pricePerKwh: string;
  validFrom: Date;
};

const labourSelect = {
  id: true,
  label: true,
  hourlyCost: true,
  currency: true,
  siteId: true,
  site: {select: {name: true}},
  validFrom: true,
  validTo: true,
  archivedAt: true,
} as const;

const energySelect = {
  id: true,
  siteId: true,
  site: {select: {name: true}},
  energyKind: true,
  pricePerKwh: true,
  currency: true,
  validFrom: true,
  validTo: true,
} as const;

export interface RateRepository {
  listLabourRates(organizationId: string): Promise<LabourRateRecord[]>;
  createLabourRate(
    organizationId: string,
    input: LabourRateInput,
  ): Promise<LabourRateRecord>;
  archiveLabourRate(organizationId: string, id: string): Promise<boolean>;
  listEnergyTariffs(organizationId: string): Promise<EnergyTariffRecord[]>;
  createEnergyTariff(
    organizationId: string,
    input: EnergyTariffInput,
  ): Promise<EnergyTariffRecord>;
  closeEnergyTariff(
    organizationId: string,
    id: string,
    validTo: Date,
  ): Promise<boolean>;
}

export const rateRepository: RateRepository = {
  async listLabourRates(organizationId) {
    const rates = await prisma.labourRate.findMany({
      where: {organizationId},
      orderBy: [{validFrom: "desc"}, {label: "asc"}],
      select: labourSelect,
    });

    return rates.map((rate) => ({
      id: rate.id,
      label: rate.label,
      hourlyCost: rate.hourlyCost.toString(),
      currency: rate.currency,
      siteId: rate.siteId,
      siteName: rate.site?.name ?? null,
      validFrom: rate.validFrom,
      validTo: rate.validTo,
      archivedAt: rate.archivedAt,
    }));
  },

  async createLabourRate(organizationId, input) {
    const rate = await prisma.labourRate.create({
      data: {organizationId, ...input},
      select: labourSelect,
    });

    return {
      id: rate.id,
      label: rate.label,
      hourlyCost: rate.hourlyCost.toString(),
      currency: rate.currency,
      siteId: rate.siteId,
      siteName: rate.site?.name ?? null,
      validFrom: rate.validFrom,
      validTo: rate.validTo,
      archivedAt: rate.archivedAt,
    };
  },

  async archiveLabourRate(organizationId, id) {
    const result = await prisma.labourRate.updateMany({
      where: {id, organizationId, archivedAt: null},
      data: {archivedAt: new Date()},
    });

    return result.count > 0;
  },

  async listEnergyTariffs(organizationId) {
    const tariffs = await prisma.energyTariff.findMany({
      where: {organizationId},
      orderBy: [{validFrom: "desc"}, {siteId: "asc"}],
      select: energySelect,
    });

    return tariffs.map((tariff) => ({
      id: tariff.id,
      siteId: tariff.siteId,
      siteName: tariff.site.name,
      energyKind: tariff.energyKind as EnergyTariffRecord["energyKind"],
      pricePerKwh: tariff.pricePerKwh.toString(),
      currency: tariff.currency,
      validFrom: tariff.validFrom,
      validTo: tariff.validTo,
    }));
  },

  async createEnergyTariff(organizationId, input) {
    const tariff = await prisma.energyTariff.create({
      data: {organizationId, ...input},
      select: energySelect,
    });

    return {
      id: tariff.id,
      siteId: tariff.siteId,
      siteName: tariff.site.name,
      energyKind: tariff.energyKind as EnergyTariffRecord["energyKind"],
      pricePerKwh: tariff.pricePerKwh.toString(),
      currency: tariff.currency,
      validFrom: tariff.validFrom,
      validTo: tariff.validTo,
    };
  },

  async closeEnergyTariff(organizationId, id, validTo) {
    const result = await prisma.energyTariff.updateMany({
      where: {id, organizationId, validTo: null},
      data: {validTo},
    });

    return result.count > 0;
  },
};
