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

export type ItemOption = {
  id: string;
  code: string;
  name: string;
  type: ItemTypeName;
  stockUnitId: string;
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

export type SupplierRecord = {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  defaultLeadTimeDays: number | null;
  note: string | null;
  isArchived: boolean;
};

export type SupplierListRecord = SupplierRecord & {
  activeItemCount: number;
};

export type SupplierItemRecord = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  supplierRef: string | null;
  packQuantity: string;
  packUnitId: string;
  packUnitCode: string;
  price: string;
  currency: string;
  leadTimeDays: number | null;
  minOrderQuantity: string | null;
  isPreferred: boolean;
  validFrom: Date;
  validTo: Date | null;
  isArchived: boolean;
};

export type SupplierDetailRecord = SupplierRecord & {
  items: SupplierItemRecord[];
};

export type ReceiptStatusName = "DRAFT" | "POSTED" | "CANCELLED";

export type ReceiptSummaryRecord = {
  id: string;
  number: string;
  supplierName: string;
  siteName: string;
  status: ReceiptStatusName;
  receivedAt: Date | null;
  totalAmount: string;
  currency: string;
  lineCount: number;
  createdAt: Date;
};

export type ReceiptLineRecord = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: string;
  unitCode: string;
  unitPrice: string;
  lineTotal: string;
  lotNumber: string | null;
  supplierLotNumber: string | null;
  expiresOn: Date | null;
  bestBeforeOn: Date | null;
  lotId: string | null;
};

export type ReceiptDetailRecord = ReceiptSummaryRecord & {
  supplierId: string;
  siteId: string;
  supplierReference: string | null;
  note: string | null;
  lines: ReceiptLineRecord[];
};

export type ReceiptFormOptions = {
  suppliers: {id: string; name: string; code: string}[];
  sites: {id: string; name: string; code: string}[];
  items: {id: string; code: string; name: string}[];
  units: {id: string; code: string; labelEn: string; labelFr: string}[];
};

export type StockLevelRecord = {
  itemId: string;
  itemCode: string;
  itemName: string;
  siteId: string;
  siteName: string;
  unitCode: string;
  quantity: string;
  minStockQuantity: string | null;
  parLevelQuantity: string | null;
  isBelowMin: boolean;
};

export type LotSummaryRecord = {
  id: string;
  lotNumber: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  siteId: string;
  siteName: string;
  quantityRemaining: string;
  unitCode: string;
  unitCost: string;
  currency: string;
  receivedAt: Date;
  expiresOn: Date | null;
  status:
    | "AVAILABLE"
    | "QUARANTINE"
    | "CONSUMED"
    | "EXPIRED"
    | "DISCARDED";
};

export type StockMovementRecord = {
  id: string;
  type:
    | "RECEIPT"
    | "CONSUMPTION"
    | "PRODUCTION_OUTPUT"
    | "DISPATCH"
    | "WASTE"
    | "TRANSFER"
    | "ADJUSTMENT"
    | "COUNT";
  quantity: string;
  unitCode: string;
  occurredAt: Date;
  referenceType: string | null;
  reason: string | null;
};

export type LotDetailRecord = LotSummaryRecord & {
  quantityReceived: string;
  movements: StockMovementRecord[];
};
