-- CreateEnum
CREATE TYPE "SiteKind" AS ENUM ('WORKSHOP', 'SHOP', 'WAREHOUSE', 'LAB');

-- CreateEnum
CREATE TYPE "EnergyKind" AS ENUM ('ELECTRICITY', 'GAS');

-- CreateEnum
CREATE TYPE "UnitKind" AS ENUM ('MASS', 'VOLUME', 'COUNT', 'LENGTH');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('RAW_MATERIAL', 'PACKAGING', 'SEMI_FINISHED', 'FINISHED_PRODUCT');

-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('RETAIL', 'WHOLESALE', 'BOTH', 'NONE');

-- CreateEnum
CREATE TYPE "AllergenPresence" AS ENUM ('CONTAINS', 'MAY_CONTAIN');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecipeVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CostScope" AS ENUM ('RECIPE_VERSION', 'PRODUCTION_BATCH');

-- CreateEnum
CREATE TYPE "CostLineKind" AS ENUM ('MATERIAL', 'PACKAGING', 'LABOUR', 'ENERGY', 'OVERHEAD');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('AVAILABLE', 'QUARANTINE', 'CONSUMED', 'EXPIRED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT', 'CONSUMPTION', 'PRODUCTION_OUTPUT', 'DISPATCH', 'WASTE', 'TRANSFER', 'ADJUSTMENT', 'COUNT');

-- CreateEnum
CREATE TYPE "StockReferenceType" AS ENUM ('PURCHASE_RECEIPT', 'PRODUCTION_BATCH', 'DISPATCH', 'WASTE_RECORD', 'STOCK_COUNT', 'MANUAL');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LossCategory" AS ENUM ('OVERPRODUCTION', 'EXPIRED', 'BREAKAGE', 'QUALITY', 'TRIMMING', 'STAFF_MEAL', 'DONATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SalesSource" AS ENUM ('MANUAL', 'IMPORT', 'POS');

-- CreateEnum
CREATE TYPE "EquipmentKind" AS ENUM ('OVEN', 'MIXER', 'FRIDGE', 'FREEZER', 'PROOFER', 'FRYER', 'SCALE', 'LABELLER', 'OTHER');

-- CreateTable
CREATE TABLE "site" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SiteKind" NOT NULL DEFAULT 'WORKSHOP',
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_setting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "overheadPct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "defaultLabourRateId" TEXT,
    "forecastHistoryDays" INTEGER NOT NULL DEFAULT 56,
    "forecastSafetyPct" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "defaultShelfLifeDays" INTEGER,
    "lotNumberPattern" TEXT NOT NULL DEFAULT '{site}-{yyMMdd}-{seq}',
    "pricesIncludeVat" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_tariff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "energyKind" "EnergyKind" NOT NULL DEFAULT 'ELECTRICITY',
    "pricePerKwh" DECIMAL(12,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "energy_tariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_rate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT,
    "label" TEXT NOT NULL,
    "hourlyCost" DECIMAL(12,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labour_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelFr" TEXT NOT NULL,
    "pluralFr" TEXT NOT NULL,
    "kind" "UnitKind" NOT NULL,
    "factorToBase" DECIMAL(18,8) NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ItemType" NOT NULL,
    "stockUnitId" TEXT NOT NULL,
    "saleUnitId" TEXT,
    "salePrice" DECIMAL(12,4),
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 5.50,
    "shelfLifeDays" INTEGER,
    "minStockQuantity" DECIMAL(14,4),
    "parLevelQuantity" DECIMAL(14,4),
    "defaultChannel" "SalesChannel" NOT NULL DEFAULT 'RETAIL',
    "isPurchasable" BOOLEAN NOT NULL DEFAULT false,
    "isProduced" BOOLEAN NOT NULL DEFAULT false,
    "isSellable" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_category" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergen" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelFr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allergen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_allergen" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "allergenId" TEXT NOT NULL,
    "presence" "AllergenPresence" NOT NULL DEFAULT 'CONTAINS',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_allergen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "defaultLeadTimeDays" INTEGER,
    "note" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_item" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "supplierRef" TEXT,
    "packQuantity" DECIMAL(14,4) NOT NULL,
    "packUnitId" TEXT NOT NULL,
    "price" DECIMAL(12,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "leadTimeDays" INTEGER,
    "minOrderQuantity" DECIMAL(14,4),
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierReference" TEXT,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "receivedAt" TIMESTAMP(3),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "totalAmount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "note" TEXT,
    "receivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipt_line" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purchaseReceiptId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "supplierItemId" TEXT,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitId" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "lineTotal" DECIMAL(12,4) NOT NULL,
    "lotNumber" TEXT,
    "supplierLotNumber" TEXT,
    "expiresOn" DATE,
    "bestBeforeOn" DATE,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_receipt_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "outputItemId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_version" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "RecipeVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "yieldQuantity" DECIMAL(14,4) NOT NULL,
    "yieldUnitId" TEXT NOT NULL,
    "portionCount" INTEGER,
    "prepMinutes" INTEGER,
    "cookMinutes" INTEGER,
    "instructions" TEXT,
    "changeNote" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_line" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recipeVersionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitId" TEXT NOT NULL,
    "lossPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_operation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recipeVersionId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "labourRateId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "activeMinutes" INTEGER,
    "temperatureC" DECIMAL(5,2),
    "estimatedQuantity" DECIMAL(14,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "EquipmentKind" NOT NULL DEFAULT 'OTHER',
    "powerKw" DECIMAL(8,3),
    "note" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_snapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT,
    "scope" "CostScope" NOT NULL,
    "recipeVersionId" TEXT,
    "productionBatchId" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "materialCost" DECIMAL(12,4) NOT NULL,
    "packagingCost" DECIMAL(12,4) NOT NULL,
    "labourCost" DECIMAL(12,4) NOT NULL,
    "energyCost" DECIMAL(12,4) NOT NULL,
    "overheadCost" DECIMAL(12,4) NOT NULL,
    "totalCost" DECIMAL(12,4) NOT NULL,
    "yieldQuantity" DECIMAL(14,4) NOT NULL,
    "yieldUnitId" TEXT NOT NULL,
    "costPerUnit" DECIMAL(12,4) NOT NULL,
    "salePrice" DECIMAL(12,4),
    "marginPct" DECIMAL(5,2),
    "inputHash" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_snapshot_line" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "costSnapshotId" TEXT NOT NULL,
    "kind" "CostLineKind" NOT NULL,
    "itemId" TEXT,
    "lotId" TEXT,
    "recipeOperationId" TEXT,
    "label" TEXT NOT NULL,
    "quantity" DECIMAL(14,4),
    "unitId" TEXT,
    "unitCost" DECIMAL(12,4),
    "amount" DECIMAL(12,4) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_snapshot_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "purchaseReceiptLineId" TEXT,
    "productionBatchId" TEXT,
    "lotNumber" TEXT NOT NULL,
    "supplierLotNumber" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "producedOn" DATE,
    "expiresOn" DATE,
    "bestBeforeOn" DATE,
    "quantityReceived" DECIMAL(14,4) NOT NULL,
    "quantityRemaining" DECIMAL(14,4) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "status" "LotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceType" "StockReferenceType",
    "referenceId" TEXT,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "recipeVersionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedQuantity" DECIMAL(14,4) NOT NULL,
    "actualQuantity" DECIMAL(14,4),
    "unitId" TEXT NOT NULL,
    "plannedStartAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "producedOn" DATE,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batch_input" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productionBatchId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "theoreticalQuantity" DECIMAL(14,4),
    "unitId" TEXT NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_batch_input_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batch_output" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productionBatchId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "costPerUnit" DECIMAL(12,4),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_batch_output_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loss_reason" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelFr" TEXT NOT NULL,
    "labelEn" TEXT,
    "category" "LossCategory" NOT NULL DEFAULT 'OTHER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loss_reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_record" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT,
    "productionBatchId" TEXT,
    "lossReasonId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitId" TEXT NOT NULL,
    "costImpact" DECIMAL(12,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "note" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waste_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_daily" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "channel" "SalesChannel" NOT NULL DEFAULT 'RETAIL',
    "quantitySold" DECIMAL(14,4) NOT NULL,
    "unitId" TEXT NOT NULL,
    "revenue" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "source" "SalesSource" NOT NULL DEFAULT 'MANUAL',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_organizationId_isActive_idx" ON "site"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "site_organizationId_code_key" ON "site"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_setting_organizationId_key" ON "organization_setting"("organizationId");

-- CreateIndex
CREATE INDEX "energy_tariff_organizationId_idx" ON "energy_tariff"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "energy_tariff_siteId_energyKind_validFrom_key" ON "energy_tariff"("siteId", "energyKind", "validFrom");

-- CreateIndex
CREATE INDEX "labour_rate_organizationId_siteId_validFrom_idx" ON "labour_rate"("organizationId", "siteId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "unit_code_key" ON "unit"("code");

-- CreateIndex
CREATE INDEX "item_organizationId_type_idx" ON "item"("organizationId", "type");

-- CreateIndex
CREATE INDEX "item_organizationId_categoryId_idx" ON "item"("organizationId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "item_organizationId_code_key" ON "item"("organizationId", "code");

-- CreateIndex
CREATE INDEX "item_category_organizationId_idx" ON "item_category"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "item_category_organizationId_parentId_name_key" ON "item_category"("organizationId", "parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "allergen_code_key" ON "allergen"("code");

-- CreateIndex
CREATE INDEX "item_allergen_organizationId_idx" ON "item_allergen"("organizationId");

-- CreateIndex
CREATE INDEX "item_allergen_allergenId_idx" ON "item_allergen"("allergenId");

-- CreateIndex
CREATE UNIQUE INDEX "item_allergen_itemId_allergenId_presence_key" ON "item_allergen"("itemId", "allergenId", "presence");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_organizationId_code_key" ON "supplier"("organizationId", "code");

-- CreateIndex
CREATE INDEX "supplier_item_organizationId_itemId_isPreferred_idx" ON "supplier_item"("organizationId", "itemId", "isPreferred");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_item_supplierId_itemId_validFrom_key" ON "supplier_item"("supplierId", "itemId", "validFrom");

-- CreateIndex
CREATE INDEX "purchase_receipt_siteId_receivedAt_idx" ON "purchase_receipt"("siteId", "receivedAt");

-- CreateIndex
CREATE INDEX "purchase_receipt_supplierId_idx" ON "purchase_receipt"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipt_organizationId_number_key" ON "purchase_receipt"("organizationId", "number");

-- CreateIndex
CREATE INDEX "purchase_receipt_line_purchaseReceiptId_idx" ON "purchase_receipt_line"("purchaseReceiptId");

-- CreateIndex
CREATE INDEX "purchase_receipt_line_itemId_idx" ON "purchase_receipt_line"("itemId");

-- CreateIndex
CREATE INDEX "purchase_receipt_line_organizationId_idx" ON "purchase_receipt_line"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_currentVersionId_key" ON "recipe"("currentVersionId");

-- CreateIndex
CREATE INDEX "recipe_organizationId_outputItemId_isDefault_idx" ON "recipe"("organizationId", "outputItemId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_organizationId_code_key" ON "recipe"("organizationId", "code");

-- CreateIndex
CREATE INDEX "recipe_version_organizationId_status_idx" ON "recipe_version"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_version_recipeId_versionNumber_key" ON "recipe_version"("recipeId", "versionNumber");

-- CreateIndex
CREATE INDEX "recipe_line_itemId_idx" ON "recipe_line"("itemId");

-- CreateIndex
CREATE INDEX "recipe_line_organizationId_idx" ON "recipe_line"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_line_recipeVersionId_position_key" ON "recipe_line"("recipeVersionId", "position");

-- CreateIndex
CREATE INDEX "recipe_operation_organizationId_idx" ON "recipe_operation"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_operation_recipeVersionId_position_key" ON "recipe_operation"("recipeVersionId", "position");

-- CreateIndex
CREATE INDEX "equipment_organizationId_siteId_idx" ON "equipment"("organizationId", "siteId");

-- CreateIndex
CREATE INDEX "cost_snapshot_organizationId_recipeVersionId_computedAt_idx" ON "cost_snapshot"("organizationId", "recipeVersionId", "computedAt");

-- CreateIndex
CREATE INDEX "cost_snapshot_productionBatchId_idx" ON "cost_snapshot"("productionBatchId");

-- CreateIndex
CREATE INDEX "cost_snapshot_line_costSnapshotId_kind_position_idx" ON "cost_snapshot_line"("costSnapshotId", "kind", "position");

-- CreateIndex
CREATE INDEX "cost_snapshot_line_organizationId_idx" ON "cost_snapshot_line"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "lot_purchaseReceiptLineId_key" ON "lot"("purchaseReceiptLineId");

-- CreateIndex
CREATE INDEX "lot_siteId_expiresOn_idx" ON "lot"("siteId", "expiresOn");

-- CreateIndex
CREATE INDEX "lot_organizationId_itemId_status_idx" ON "lot"("organizationId", "itemId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "lot_organizationId_siteId_itemId_lotNumber_key" ON "lot"("organizationId", "siteId", "itemId", "lotNumber");

-- CreateIndex
CREATE INDEX "stock_movement_organizationId_itemId_occurredAt_idx" ON "stock_movement"("organizationId", "itemId", "occurredAt");

-- CreateIndex
CREATE INDEX "stock_movement_lotId_occurredAt_idx" ON "stock_movement"("lotId", "occurredAt");

-- CreateIndex
CREATE INDEX "stock_movement_referenceType_referenceId_idx" ON "stock_movement"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "production_batch_siteId_producedOn_idx" ON "production_batch"("siteId", "producedOn");

-- CreateIndex
CREATE INDEX "production_batch_recipeVersionId_idx" ON "production_batch"("recipeVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "production_batch_organizationId_code_key" ON "production_batch"("organizationId", "code");

-- CreateIndex
CREATE INDEX "production_batch_input_lotId_idx" ON "production_batch_input"("lotId");

-- CreateIndex
CREATE INDEX "production_batch_input_organizationId_idx" ON "production_batch_input"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "production_batch_input_productionBatchId_lotId_key" ON "production_batch_input"("productionBatchId", "lotId");

-- CreateIndex
CREATE INDEX "production_batch_output_lotId_idx" ON "production_batch_output"("lotId");

-- CreateIndex
CREATE INDEX "production_batch_output_organizationId_idx" ON "production_batch_output"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "production_batch_output_productionBatchId_lotId_key" ON "production_batch_output"("productionBatchId", "lotId");

-- CreateIndex
CREATE UNIQUE INDEX "loss_reason_organizationId_code_key" ON "loss_reason"("organizationId", "code");

-- CreateIndex
CREATE INDEX "waste_record_siteId_recordedAt_idx" ON "waste_record"("siteId", "recordedAt");

-- CreateIndex
CREATE INDEX "waste_record_organizationId_lossReasonId_recordedAt_idx" ON "waste_record"("organizationId", "lossReasonId", "recordedAt");

-- CreateIndex
CREATE INDEX "waste_record_lotId_idx" ON "waste_record"("lotId");

-- CreateIndex
CREATE INDEX "sales_daily_organizationId_businessDate_idx" ON "sales_daily"("organizationId", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "sales_daily_siteId_itemId_businessDate_channel_key" ON "sales_daily"("siteId", "itemId", "businessDate", "channel");

-- AddForeignKey
ALTER TABLE "site" ADD CONSTRAINT "site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_setting" ADD CONSTRAINT "organization_setting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_setting" ADD CONSTRAINT "organization_setting_defaultLabourRateId_fkey" FOREIGN KEY ("defaultLabourRateId") REFERENCES "labour_rate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_tariff" ADD CONSTRAINT "energy_tariff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_tariff" ADD CONSTRAINT "energy_tariff_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_rate" ADD CONSTRAINT "labour_rate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_rate" ADD CONSTRAINT "labour_rate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "item_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_stockUnitId_fkey" FOREIGN KEY ("stockUnitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_saleUnitId_fkey" FOREIGN KEY ("saleUnitId") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_category" ADD CONSTRAINT "item_category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_category" ADD CONSTRAINT "item_category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "item_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_allergen" ADD CONSTRAINT "item_allergen_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_allergen" ADD CONSTRAINT "item_allergen_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_allergen" ADD CONSTRAINT "item_allergen_allergenId_fkey" FOREIGN KEY ("allergenId") REFERENCES "allergen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_item" ADD CONSTRAINT "supplier_item_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_item" ADD CONSTRAINT "supplier_item_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_item" ADD CONSTRAINT "supplier_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_item" ADD CONSTRAINT "supplier_item_packUnitId_fkey" FOREIGN KEY ("packUnitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt" ADD CONSTRAINT "purchase_receipt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt" ADD CONSTRAINT "purchase_receipt_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt" ADD CONSTRAINT "purchase_receipt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt" ADD CONSTRAINT "purchase_receipt_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_line" ADD CONSTRAINT "purchase_receipt_line_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_line" ADD CONSTRAINT "purchase_receipt_line_purchaseReceiptId_fkey" FOREIGN KEY ("purchaseReceiptId") REFERENCES "purchase_receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_line" ADD CONSTRAINT "purchase_receipt_line_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_line" ADD CONSTRAINT "purchase_receipt_line_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "supplier_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_line" ADD CONSTRAINT "purchase_receipt_line_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "recipe_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_version" ADD CONSTRAINT "recipe_version_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_version" ADD CONSTRAINT "recipe_version_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_version" ADD CONSTRAINT "recipe_version_yieldUnitId_fkey" FOREIGN KEY ("yieldUnitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_version" ADD CONSTRAINT "recipe_version_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_line" ADD CONSTRAINT "recipe_line_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_line" ADD CONSTRAINT "recipe_line_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_line" ADD CONSTRAINT "recipe_line_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_line" ADD CONSTRAINT "recipe_line_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_operation" ADD CONSTRAINT "recipe_operation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_operation" ADD CONSTRAINT "recipe_operation_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_operation" ADD CONSTRAINT "recipe_operation_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_operation" ADD CONSTRAINT "recipe_operation_labourRateId_fkey" FOREIGN KEY ("labourRateId") REFERENCES "labour_rate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot" ADD CONSTRAINT "cost_snapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot" ADD CONSTRAINT "cost_snapshot_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot" ADD CONSTRAINT "cost_snapshot_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot" ADD CONSTRAINT "cost_snapshot_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "production_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot" ADD CONSTRAINT "cost_snapshot_yieldUnitId_fkey" FOREIGN KEY ("yieldUnitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot" ADD CONSTRAINT "cost_snapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot_line" ADD CONSTRAINT "cost_snapshot_line_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot_line" ADD CONSTRAINT "cost_snapshot_line_costSnapshotId_fkey" FOREIGN KEY ("costSnapshotId") REFERENCES "cost_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot_line" ADD CONSTRAINT "cost_snapshot_line_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot_line" ADD CONSTRAINT "cost_snapshot_line_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot_line" ADD CONSTRAINT "cost_snapshot_line_recipeOperationId_fkey" FOREIGN KEY ("recipeOperationId") REFERENCES "recipe_operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_snapshot_line" ADD CONSTRAINT "cost_snapshot_line_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_purchaseReceiptLineId_fkey" FOREIGN KEY ("purchaseReceiptLineId") REFERENCES "purchase_receipt_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "production_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch" ADD CONSTRAINT "production_batch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch" ADD CONSTRAINT "production_batch_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch" ADD CONSTRAINT "production_batch_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch" ADD CONSTRAINT "production_batch_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch_input" ADD CONSTRAINT "production_batch_input_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch_input" ADD CONSTRAINT "production_batch_input_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "production_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch_input" ADD CONSTRAINT "production_batch_input_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch_input" ADD CONSTRAINT "production_batch_input_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch_input" ADD CONSTRAINT "production_batch_input_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch_output" ADD CONSTRAINT "production_batch_output_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch_output" ADD CONSTRAINT "production_batch_output_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "production_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch_output" ADD CONSTRAINT "production_batch_output_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch_output" ADD CONSTRAINT "production_batch_output_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batch_output" ADD CONSTRAINT "production_batch_output_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loss_reason" ADD CONSTRAINT "loss_reason_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_record" ADD CONSTRAINT "waste_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_record" ADD CONSTRAINT "waste_record_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_record" ADD CONSTRAINT "waste_record_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_record" ADD CONSTRAINT "waste_record_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_record" ADD CONSTRAINT "waste_record_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "production_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_record" ADD CONSTRAINT "waste_record_lossReasonId_fkey" FOREIGN KEY ("lossReasonId") REFERENCES "loss_reason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_record" ADD CONSTRAINT "waste_record_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_record" ADD CONSTRAINT "waste_record_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_daily" ADD CONSTRAINT "sales_daily_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_daily" ADD CONSTRAINT "sales_daily_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_daily" ADD CONSTRAINT "sales_daily_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_daily" ADD CONSTRAINT "sales_daily_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Constraints Prisma cannot express.
-- See docs/ERD.md, "Business invariants".
-- ---------------------------------------------------------------------------

-- Invariant 3: at most one published version per recipe.
CREATE UNIQUE INDEX "recipe_version_one_published"
    ON "recipe_version" ("recipeId")
    WHERE "status" = 'PUBLISHED';

-- Invariant 26: exactly one base unit per unit kind.
CREATE UNIQUE INDEX "unit_one_base_per_kind"
    ON "unit" ("kind")
    WHERE "isBase";

-- Invariant 27: root categories are unique although "parentId" is nullable.
CREATE UNIQUE INDEX "item_category_root_name"
    ON "item_category" ("organizationId", "name")
    WHERE "parentId" IS NULL;

-- Invariant 8: a lot can never hold a negative quantity.
ALTER TABLE "lot" ADD CONSTRAINT "lot_quantity_remaining_non_negative"
    CHECK ("quantityRemaining" >= 0);

-- Invariant 19: a cost snapshot matches its scope.
ALTER TABLE "cost_snapshot" ADD CONSTRAINT "cost_snapshot_scope_shape"
    CHECK (
        ("scope" = 'RECIPE_VERSION' AND "recipeVersionId" IS NOT NULL AND "productionBatchId" IS NULL)
        OR ("scope" = 'PRODUCTION_BATCH' AND "productionBatchId" IS NOT NULL AND "recipeVersionId" IS NULL)
    );

-- Invariant 17: waste is attributed to exactly one source.
ALTER TABLE "waste_record" ADD CONSTRAINT "waste_record_one_source"
    CHECK ((("lotId" IS NOT NULL)::int + ("productionBatchId" IS NOT NULL)::int) = 1);

-- Invariant 10: ledger and snapshot rows are append-only. Updates are rejected
-- in the database; deletes are rejected by the service layer, because the
-- foreign-key cascades above must still be able to remove a whole tenant.
CREATE OR REPLACE FUNCTION "forbid_append_only_update"() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '%.% is append-only and cannot be updated', TG_TABLE_SCHEMA, TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER "stock_movement_append_only"
    BEFORE UPDATE ON "stock_movement"
    FOR EACH ROW EXECUTE FUNCTION "forbid_append_only_update"();

CREATE TRIGGER "cost_snapshot_append_only"
    BEFORE UPDATE ON "cost_snapshot"
    FOR EACH ROW EXECUTE FUNCTION "forbid_append_only_update"();

CREATE TRIGGER "cost_snapshot_line_append_only"
    BEFORE UPDATE ON "cost_snapshot_line"
    FOR EACH ROW EXECUTE FUNCTION "forbid_append_only_update"();

-- ---------------------------------------------------------------------------
-- Reference data: units and the 14 EU allergens.
-- Inserted here rather than at application startup so every environment has
-- the same rows, and so a fresh database can cost a recipe immediately.
-- ---------------------------------------------------------------------------

INSERT INTO "unit" ("id", "code", "labelEn", "labelFr", "pluralFr", "kind", "factorToBase", "isBase", "createdAt", "updatedAt") VALUES
    ('unit_kg',     'kg',     'kilogram',   'kilogramme',   'kilogrammes',   'MASS',   1,          true,  now(), now()),
    ('unit_g',      'g',      'gram',       'gramme',       'grammes',       'MASS',   0.001,      false, now(), now()),
    ('unit_mg',     'mg',     'milligram',  'milligramme',  'milligrammes',  'MASS',   0.000001,   false, now(), now()),
    ('unit_l',      'L',      'litre',      'litre',        'litres',        'VOLUME', 1,          true,  now(), now()),
    ('unit_cl',     'cl',     'centilitre', 'centilitre',   'centilitres',   'VOLUME', 0.01,       false, now(), now()),
    ('unit_ml',     'ml',     'millilitre', 'millilitre',   'millilitres',   'VOLUME', 0.001,      false, now(), now()),
    ('unit_piece',  'piece',  'piece',      'pièce',        'pièces',        'COUNT',  1,          true,  now(), now()),
    ('unit_dozen',  'dozen',  'dozen',      'douzaine',     'douzaines',     'COUNT',  12,         false, now(), now()),
    ('unit_m',      'm',      'metre',      'mètre',        'mètres',        'LENGTH', 1,          true,  now(), now()),
    ('unit_cm',     'cm',     'centimetre', 'centimètre',   'centimètres',   'LENGTH', 0.01,       false, now(), now());

INSERT INTO "allergen" ("id", "code", "labelEn", "labelFr", "sortOrder", "createdAt", "updatedAt") VALUES
    ('allergen_gluten',      'GLUTEN',      'Cereals containing gluten',    'Céréales contenant du gluten',      1,  now(), now()),
    ('allergen_crustaceans', 'CRUSTACEANS', 'Crustaceans',                  'Crustacés',                        2,  now(), now()),
    ('allergen_eggs',        'EGGS',        'Eggs',                         'Œufs',                             3,  now(), now()),
    ('allergen_fish',        'FISH',        'Fish',                         'Poisson',                          4,  now(), now()),
    ('allergen_peanuts',     'PEANUTS',     'Peanuts',                      'Arachides',                        5,  now(), now()),
    ('allergen_soybeans',    'SOYBEANS',    'Soybeans',                     'Soja',                             6,  now(), now()),
    ('allergen_milk',        'MILK',        'Milk',                         'Lait',                             7,  now(), now()),
    ('allergen_nuts',        'NUTS',        'Nuts',                         'Fruits à coque',                   8,  now(), now()),
    ('allergen_celery',      'CELERY',      'Celery',                       'Céleri',                           9,  now(), now()),
    ('allergen_mustard',     'MUSTARD',     'Mustard',                      'Moutarde',                         10, now(), now()),
    ('allergen_sesame',      'SESAME',      'Sesame',                       'Sésame',                           11, now(), now()),
    ('allergen_sulphites',   'SULPHITES',   'Sulphur dioxide and sulphites','Anhydride sulfureux et sulfites',  12, now(), now()),
    ('allergen_lupin',       'LUPIN',       'Lupin',                        'Lupin',                            13, now(), now()),
    ('allergen_molluscs',    'MOLLUSCS',    'Molluscs',                     'Mollusques',                       14, now(), now());
