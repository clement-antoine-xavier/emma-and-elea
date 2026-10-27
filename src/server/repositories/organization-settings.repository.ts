import {prisma} from "@/lib/prisma";
import type {DefaultLossReason} from "@/server/domain/organization-defaults";
import type {OrganizationSettingsRecord} from "./types";

export type OrganizationSettingsInput = {
  currency: string;
  overheadPct: string;
  forecastHistoryDays: number;
  forecastSafetyPct: string;
  defaultShelfLifeDays: number | null;
  lotNumberPattern: string;
  pricesIncludeVat: boolean;
};

const settingsSelect = {
  currency: true,
  overheadPct: true,
  forecastHistoryDays: true,
  forecastSafetyPct: true,
  defaultShelfLifeDays: true,
  lotNumberPattern: true,
  pricesIncludeVat: true,
} as const;

type SelectedSettings = {
  currency: string;
  overheadPct: {toString(): string};
  forecastHistoryDays: number;
  forecastSafetyPct: {toString(): string};
  defaultShelfLifeDays: number | null;
  lotNumberPattern: string;
  pricesIncludeVat: boolean;
};

function toRecord(settings: SelectedSettings): OrganizationSettingsRecord {
  return {
    currency: settings.currency,
    overheadPct: settings.overheadPct.toString(),
    forecastHistoryDays: settings.forecastHistoryDays,
    forecastSafetyPct: settings.forecastSafetyPct.toString(),
    defaultShelfLifeDays: settings.defaultShelfLifeDays,
    lotNumberPattern: settings.lotNumberPattern,
    pricesIncludeVat: settings.pricesIncludeVat,
  };
}

export interface OrganizationSettingsRepository {
  ensureDefaults(
    organizationId: string,
    lossReasons: readonly DefaultLossReason[],
  ): Promise<void>;
  get(organizationId: string): Promise<OrganizationSettingsRecord | null>;
  update(
    organizationId: string,
    input: OrganizationSettingsInput,
  ): Promise<OrganizationSettingsRecord>;
}

export const organizationSettingsRepository: OrganizationSettingsRepository = {
  async ensureDefaults(organizationId, lossReasons) {
    await prisma.$transaction([
      prisma.organizationSetting.upsert({
        where: {organizationId},
        create: {organizationId},
        update: {},
      }),
      prisma.lossReason.createMany({
        data: lossReasons.map((reason) => ({
          organizationId,
          code: reason.code,
          labelFr: reason.labelFr,
          labelEn: reason.labelEn,
          category: reason.category,
          sortOrder: reason.sortOrder,
        })),
        skipDuplicates: true,
      }),
    ]);
  },

  async get(organizationId) {
    const settings = await prisma.organizationSetting.findUnique({
      where: {organizationId},
      select: settingsSelect,
    });

    return settings ? toRecord(settings) : null;
  },

  async update(organizationId, input) {
    const settings = await prisma.organizationSetting.upsert({
      where: {organizationId},
      create: {organizationId, ...input},
      update: input,
      select: settingsSelect,
    });

    return toRecord(settings);
  },
};
