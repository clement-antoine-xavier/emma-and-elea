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

export type RecipeStatusName = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type RecipeListRecord = {
  id: string;
  code: string;
  name: string;
  outputItemName: string;
  versionNumber: number | null;
  status: RecipeStatusName | null;
  costPerUnit: string | null;
  currency: string | null;
  marginPct: string | null;
  isArchived: boolean;
};

export type RecipeVersionSummary = {
  id: string;
  versionNumber: number;
  status: RecipeStatusName;
  yieldQuantity: string;
  yieldUnitCode: string;
  portionCount: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  costPerUnit: string | null;
  currency: string | null;
  marginPct: string | null;
};

export type RecipeDetailRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  outputItemId: string;
  outputItemName: string;
  outputItemType: ItemTypeName;
  currentVersionId: string | null;
  isArchived: boolean;
  versions: RecipeVersionSummary[];
};

export type RecipeLineRecord = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: ItemTypeName;
  quantity: string;
  unitId: string;
  unitCode: string;
  unitKind: string;
  unitFactorToBase: string;
  itemStockUnitId: string;
  itemStockUnitCode: string;
  itemStockUnitKind: string;
  itemStockUnitFactorToBase: string;
  lossPct: string;
  isOptional: boolean;
  position: number;
  note: string | null;
};

export type RecipeOperationRecord = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  durationMinutes: number;
  activeMinutes: number | null;
  equipmentId: string | null;
  equipmentName: string | null;
  equipmentPowerKw: string | null;
  equipmentSiteId: string | null;
  labourRateId: string | null;
  labourRateLabel: string | null;
};

export type RecipeCostLineRecord = {
  id: string;
  kind: "MATERIAL" | "PACKAGING" | "LABOUR" | "ENERGY" | "OVERHEAD";
  label: string;
  quantity: string | null;
  unitCode: string | null;
  unitCost: string | null;
  amount: string;
};

export type RecipeCostWarning = {
  code: "MISSING_PRICE" | "MISSING_RATE" | "MISSING_TARIFF";
  subject: string;
};

export type RecipeCostRecord = {
  materialCost: string;
  packagingCost: string;
  labourCost: string;
  energyCost: string;
  overheadCost: string;
  totalCost: string;
  costPerUnit: string;
  marginPct: string | null;
  currency: string;
  computedAt: Date | null;
  lines: RecipeCostLineRecord[];
  warnings: RecipeCostWarning[];
};

export type RecipeVersionDetailRecord = {
  id: string;
  recipeId: string;
  recipeCode: string;
  recipeName: string;
  versionNumber: number;
  status: RecipeStatusName;
  yieldQuantity: string;
  yieldUnitId: string;
  yieldUnitCode: string;
  portionCount: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  instructions: string | null;
  changeNote: string | null;
  publishedAt: Date | null;
  outputItemId: string;
  outputItemName: string;
  outputItemType: ItemTypeName;
  outputStockUnitId: string;
  outputStockUnitCode: string;
  outputStockUnitKind: string;
  salePrice: string | null;
  currency: string;
  lines: RecipeLineRecord[];
  operations: RecipeOperationRecord[];
  cost: RecipeCostRecord | null;
};

export type RecipeOptions = {
  outputItems: ItemOption[];
  lineItems: ItemOption[];
  units: UnitOption[];
  equipment: {
    id: string;
    name: string;
    siteId: string | null;
    siteName: string | null;
    powerKw: string | null;
  }[];
  labourRates: {
    id: string;
    label: string;
    hourlyCost: string;
    currency: string;
    siteId: string | null;
    siteName: string | null;
  }[];
};

export type BatchStatusName =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ProductionBatchSummaryRecord = {
  id: string;
  code: string;
  status: BatchStatusName;
  siteName: string;
  recipeName: string;
  versionNumber: number;
  plannedQuantity: string;
  actualQuantity: string | null;
  unitCode: string;
  producedOn: Date | null;
  createdAt: Date;
};

export type ProductionBatchInputRecord = {
  id: string;
  lotId: string;
  lotNumber: string;
  itemId: string;
  itemName: string;
  unitCode: string;
  quantity: string;
  theoreticalQuantity: string | null;
  unitCost: string;
};

export type ProductionBatchOutputRecord = {
  id: string;
  lotId: string | null;
  lotNumber: string | null;
  itemId: string;
  itemName: string;
  quantity: string;
  unitCode: string;
  isPrimary: boolean;
  costPerUnit: string | null;
};

export type ProductionBatchDetailRecord = ProductionBatchSummaryRecord & {
  siteId: string;
  recipeId: string;
  recipeVersionId: string;
  recipeVersionNumber: number;
  recipeYieldQuantity: string;
  recipeYieldUnitId: string;
  recipeYieldUnitCode: string;
  recipeYieldUnitKind: string;
  recipeYieldUnitFactorToBase: string;
  outputItemId: string;
  outputItemName: string;
  outputSalePrice: string | null;
  outputStockUnitId: string;
  outputStockUnitCode: string;
  outputStockUnitKind: string;
  outputStockUnitFactorToBase: string;
  outputShelfLifeDays: number | null;
  unitId: string;
  unitKind: string;
  unitFactorToBase: string;
  plannedStartAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  note: string | null;
  inputs: ProductionBatchInputRecord[];
  outputs: ProductionBatchOutputRecord[];
  recipeLines: RecipeLineRecord[];
  recipeOperations: RecipeOperationRecord[];
  cost: RecipeCostRecord | null;
};

export type ProductionOptions = {
  recipes: {
    recipeId: string;
    recipeVersionId: string;
    name: string;
    versionNumber: number;
    outputItemName: string;
    yieldUnitId: string;
    yieldUnitCode: string;
  }[];
  sites: {id: string; name: string; code: string}[];
};

export type WasteRecordSummary = {
  id: string;
  itemName: string;
  lotNumber: string;
  quantity: string;
  unitCode: string;
  costImpact: string;
  currency: string;
  reasonLabel: string;
  recordedAt: Date;
  isArchived: boolean;
};

export type WasteOptions = {
  lots: {
    id: string;
    lotNumber: string;
    itemName: string;
    unitId: string;
    unitCode: string;
    quantityRemaining: string;
    unitCost: string;
    currency: string;
  }[];
  lossReasons: {id: string; labelEn: string; labelFr: string}[];
};

export type LotTraceRecord = {
  lotId: string;
  lotNumber: string;
  source: {type: "RECEIPT" | "BATCH" | "UNKNOWN"; label: string} | null;
  sourceLots: {
    lotNumber: string;
    itemName: string;
    supplierLotNumber: string | null;
  }[];
  consumedBy: {
    batchId: string;
    batchCode: string;
    outputs: {lotNumber: string; itemName: string}[];
  }[];
};
