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

export type ItemTypeName =
  | "RAW_MATERIAL"
  | "PACKAGING"
  | "SEMI_FINISHED"
  | "FINISHED_PRODUCT";

export type SalesChannelName = "RETAIL" | "WHOLESALE" | "BOTH" | "NONE";

export type UnitOption = {
  id: string;
  code: string;
  labelEn: string;
  labelFr: string;
  kind: "MASS" | "VOLUME" | "COUNT" | "LENGTH";
  isBase: boolean;
};

export type AllergenOption = {
  id: string;
  code: string;
  labelEn: string;
  labelFr: string;
};

export type CategoryRecord = {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  sortOrder: number;
  itemCount: number;
  childCount: number;
  isArchived: boolean;
};

export type ItemReference = {
  id: string;
  name: string;
};

export type ItemAllergenRecord = {
  id: string;
  allergenId: string;
  code: string;
  labelEn: string;
  labelFr: string;
  presence: "CONTAINS" | "MAY_CONTAIN";
  note: string | null;
};

export type ItemListRecord = {
  id: string;
  code: string;
  name: string;
  type: ItemTypeName;
  categoryId: string | null;
  categoryName: string | null;
  stockUnitCode: string;
  saleUnitCode: string | null;
  salePrice: string | null;
  vatRate: string;
  isPurchasable: boolean;
  isProduced: boolean;
  isSellable: boolean;
  isArchived: boolean;
};

export type ItemDetailRecord = ItemListRecord & {
  description: string | null;
  categoryId: string | null;
  stockUnitId: string;
  saleUnitId: string | null;
  shelfLifeDays: number | null;
  minStockQuantity: string | null;
  parLevelQuantity: string | null;
  defaultChannel: SalesChannelName;
  allergens: ItemAllergenRecord[];
  usedInRecipes: ItemReference[];
  producesRecipes: ItemReference[];
  supplierCount: number;
};
