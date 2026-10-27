import type {OrganizationSettingsRecord} from "@/server/repositories/types";

/**
 * Mirrors the column defaults in `prisma/schema.prisma`. Used when a settings
 * row is missing, so a read never has to create one.
 */
export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettingsRecord = {
  currency: "EUR",
  overheadPct: "10",
  forecastHistoryDays: 56,
  forecastSafetyPct: "5",
  defaultShelfLifeDays: null,
  lotNumberPattern: "{site}-{yyMMdd}-{seq}",
  pricesIncludeVat: true,
};
