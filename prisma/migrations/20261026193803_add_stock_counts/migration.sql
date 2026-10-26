-- CreateEnum
CREATE TYPE "StockCountStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "stock_count" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "status" "StockCountStatus" NOT NULL DEFAULT 'DRAFT',
    "countedAt" DATE NOT NULL,
    "postedAt" TIMESTAMP(3),
    "countedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_count_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_line" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stockCountId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT,
    "expectedQuantity" DECIMAL(14,4) NOT NULL,
    "countedQuantity" DECIMAL(14,4) NOT NULL,
    "variance" DECIMAL(14,4) NOT NULL,
    "unitId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_count_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_count_siteId_countedAt_idx" ON "stock_count"("siteId", "countedAt");

-- CreateIndex
CREATE INDEX "stock_count_organizationId_countedAt_idx" ON "stock_count"("organizationId", "countedAt");

-- CreateIndex
CREATE INDEX "stock_count_line_organizationId_idx" ON "stock_count_line"("organizationId");

-- CreateIndex
CREATE INDEX "stock_count_line_itemId_idx" ON "stock_count_line"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_count_line_stockCountId_lotId_key" ON "stock_count_line"("stockCountId", "lotId");

-- AddForeignKey
ALTER TABLE "stock_count" ADD CONSTRAINT "stock_count_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count" ADD CONSTRAINT "stock_count_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count" ADD CONSTRAINT "stock_count_countedById_fkey" FOREIGN KEY ("countedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_line" ADD CONSTRAINT "stock_count_line_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_line" ADD CONSTRAINT "stock_count_line_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "stock_count"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_line" ADD CONSTRAINT "stock_count_line_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_line" ADD CONSTRAINT "stock_count_line_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_line" ADD CONSTRAINT "stock_count_line_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
