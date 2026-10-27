/**
 * Serializable view models shared by server pages and client components.
 *
 * Keep this module free of Prisma, Better Auth and server imports: the ESLint
 * boundary forbids `src/components/**` from importing the repository layer, so
 * anything a Client Component needs to type its props lives here. Decimal
 * columns arrive as strings; see `src/lib/format.ts`.
 */

export type OrganizationSettingsRecord = {
  currency: string;
  overheadPct: string;
  forecastHistoryDays: number;
  forecastSafetyPct: string;
  defaultShelfLifeDays: number | null;
  lotNumberPattern: string;
  pricesIncludeVat: boolean;
};

export type SiteRecord = {
  id: string;
  code: string;
  name: string;
  kind: "WORKSHOP" | "SHOP" | "WAREHOUSE" | "LAB";
  city: string | null;
  timezone: string;
  isActive: boolean;
  archivedAt: Date | null;
};

export type LabourRateRecord = {
  id: string;
  label: string;
  hourlyCost: string;
  currency: string;
  siteId: string | null;
  siteName: string | null;
  validFrom: Date;
  validTo: Date | null;
  archivedAt: Date | null;
};

export type EnergyTariffRecord = {
  id: string;
  siteId: string;
  siteName: string;
  energyKind: "ELECTRICITY" | "GAS";
  pricePerKwh: string;
  currency: string;
  validFrom: Date;
  validTo: Date | null;
};

export type EquipmentRecord = {
  id: string;
  name: string;
  kind:
    | "OVEN"
    | "MIXER"
    | "FRIDGE"
    | "FREEZER"
    | "PROOFER"
    | "FRYER"
    | "SCALE"
    | "LABELLER"
    | "OTHER";
  siteId: string | null;
  siteName: string | null;
  powerKw: string | null;
  archivedAt: Date | null;
};
