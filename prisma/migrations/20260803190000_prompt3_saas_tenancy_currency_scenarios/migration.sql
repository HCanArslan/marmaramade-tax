-- CreateEnum
CREATE TYPE "ShopPlatform" AS ENUM ('ETSY', 'AMAZON', 'SHOPIFY', 'EBAY', 'CSV');

-- CreateEnum
CREATE TYPE "SaasBusinessType" AS ENUM ('NO_REGISTERED_BUSINESS', 'ARTISAN_EXEMPTION', 'SOLE_PROPRIETORSHIP', 'LIMITED_OR_CORPORATION', 'OTHER_OR_UNKNOWN');

-- CreateEnum
CREATE TYPE "TaxPlanningPreset" AS ENUM ('NONE', 'CONSERVATIVE', 'STANDARD', 'CUSTOM');

-- AlterTable
ALTER TABLE "EtsyConnection" ADD COLUMN     "saasShopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsyImportMapping" ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsyLedgerEntry" ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsyListing" ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsyListingImage" ADD COLUMN     "listingId" TEXT,
ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsyListingProductLink" ADD COLUMN     "listingId" TEXT,
ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsyOAuthState" ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsyPayment" ADD COLUMN     "receiptRecordId" TEXT,
ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsyReceipt" ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsyReceiptItem" ADD COLUMN     "listingRecordId" TEXT,
ADD COLUMN     "receiptRecordId" TEXT,
ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsySyncError" ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsySyncRun" ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "EtsyWebhookEvent" ADD COLUMN     "saasShopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "ExchangeRateSnapshot" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "FeeProfile" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shopId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "OrderAdjustment" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "OrderCostLine" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "OrderCostSnapshot" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "PackageProfile" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "ProductCostVersion" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "ProductMaterialCost" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "workspaceId" TEXT;

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" "ShopPlatform" NOT NULL,
    "externalShopId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "defaultCurrency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSetting" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "valueType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceBusinessProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceBusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceBusinessProfileVersion" (
    "id" TEXT NOT NULL,
    "workspaceBusinessProfileId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "activeKey" TEXT,
    "sellerCountry" TEXT NOT NULL,
    "reportingCurrency" TEXT NOT NULL,
    "businessType" "SaasBusinessType" NOT NULL,
    "defaultMarketplaceCurrency" TEXT NOT NULL,
    "taxPlanningPreset" "TaxPlanningPreset",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceBusinessProfileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceCostDefaultVersion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "activeKey" TEXT,
    "hourlyLabourValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "packagingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "materialWastagePercentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "returnReservePercentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "damageReservePercentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "fxLossReservePercentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "monthlyOverhead" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "exportHandlingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "costCurrency" TEXT NOT NULL,
    "sellerCountry" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL,
    "reportingCurrency" TEXT NOT NULL,
    "targetMarket" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceCostDefaultVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioScenario" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioScenarioVersion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "targetDestinationCountry" TEXT NOT NULL,
    "customsPayer" TEXT NOT NULL,
    "shippingMode" TEXT NOT NULL,
    "packageAssumptions" JSONB NOT NULL,
    "reportingCurrency" TEXT NOT NULL,
    "exchangeRateSnapshotId" TEXT,
    "feeProfileId" TEXT,
    "businessProfileVersionId" TEXT,
    "costDefaultVersionId" TEXT,
    "warnings" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioScenarioVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioScenarioItem" (
    "id" TEXT NOT NULL,
    "scenarioVersionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceOverrideAmount" DECIMAL(65,30),
    "priceOverrideCurrency" TEXT,
    "packageAssumption" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioScenarioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioScenarioAssumption" (
    "id" TEXT NOT NULL,
    "scenarioVersionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioScenarioAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioScenarioResult" (
    "id" TEXT NOT NULL,
    "scenarioVersionId" TEXT NOT NULL,
    "originalAmount" DECIMAL(65,30) NOT NULL,
    "originalCurrency" TEXT NOT NULL,
    "reportingAmount" DECIMAL(65,30) NOT NULL,
    "reportingCurrency" TEXT NOT NULL,
    "totalRevenueReporting" DECIMAL(65,30) NOT NULL,
    "totalCostReporting" DECIMAL(65,30) NOT NULL,
    "totalNetProfitReporting" DECIMAL(65,30) NOT NULL,
    "warnings" JSONB NOT NULL,
    "calculationSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioScenarioResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioScenarioResultLine" (
    "id" TEXT NOT NULL,
    "scenarioResultId" TEXT NOT NULL,
    "scenarioItemId" TEXT,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "nativeAmount" DECIMAL(65,30) NOT NULL,
    "nativeCurrency" TEXT NOT NULL,
    "reportingAmount" DECIMAL(65,30) NOT NULL,
    "reportingCurrency" TEXT NOT NULL,
    "exchangeRateUsed" DECIMAL(65,30),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioScenarioResultLine_pkey" PRIMARY KEY ("id")
);

-- Calculated scenario versions are immutable; recalculation inserts a new
-- version. Draft versions remain editable until they are finalized.
CREATE FUNCTION "prevent_calculated_portfolio_scenario_mutation"()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."status" = 'CALCULATED' THEN
        RAISE EXCEPTION 'Calculated portfolio scenario versions are immutable'
            USING ERRCODE = '55000';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PortfolioScenarioVersion_immutable_after_calculation"
BEFORE UPDATE OR DELETE ON "PortfolioScenarioVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_calculated_portfolio_scenario_mutation"();

-- This key exists before the idempotent shop insert and is not contracted.
CREATE UNIQUE INDEX "Shop_workspaceId_platform_externalShopId_key"
ON "Shop"("workspaceId", "platform", "externalShopId");

-- Resolve the legacy tenant through the stable assignment created by Prompt 2.
-- Empty development/test databases may have no assignment; a populated legacy
-- database must resolve exactly one assignment or the migration stops.
DO $$
DECLARE
    assignment_count INTEGER;
    has_legacy_rows BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO assignment_count
    FROM "LegacyWorkspaceAssignment"
    WHERE "sourceKey" = 'MARMARAMADE_LEDGER';

    SELECT EXISTS (
        SELECT 1 FROM "Product"
        UNION ALL SELECT 1 FROM "EtsyConnection"
        UNION ALL SELECT 1 FROM "Order"
        UNION ALL SELECT 1 FROM "FeeProfile"
        UNION ALL SELECT 1 FROM "ExchangeRateSnapshot"
    ) INTO has_legacy_rows;

    IF has_legacy_rows AND assignment_count <> 1 THEN
        RAISE EXCEPTION 'Prompt 3 cannot resolve exactly one MARMARAMADE_LEDGER workspace assignment';
    END IF;
END $$;

-- One stable SaaS shop is created per retained Etsy connection. IDs are derived
-- from existing connection IDs; no production workspace ID is embedded here.
INSERT INTO "Shop" (
    "id", "workspaceId", "platform", "externalShopId", "name",
    "status", "defaultCurrency", "createdAt", "updatedAt"
)
SELECT
    'legacy_etsy_' || md5(c."id"),
    a."workspaceId",
    'ETSY'::"ShopPlatform",
    c."shopId",
    COALESCE(c."shopName", 'Etsy shop'),
    c."status",
    c."shopCurrency",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EtsyConnection" c
JOIN "LegacyWorkspaceAssignment" a
  ON a."sourceKey" = 'MARMARAMADE_LEDGER'
ON CONFLICT ("workspaceId", "platform", "externalShopId") DO NOTHING;

-- Directly owned retained records. Raw SQL does not trigger Prisma @updatedAt,
-- so historical timestamps and all financial fields remain byte-for-byte intact.
UPDATE "Product" p SET "workspaceId" = a."workspaceId"
FROM "LegacyWorkspaceAssignment" a
WHERE a."sourceKey" = 'MARMARAMADE_LEDGER' AND p."workspaceId" IS NULL;

UPDATE "ProductCostVersion" v SET "workspaceId" = p."workspaceId"
FROM "Product" p
WHERE v."productId" = p."id" AND v."workspaceId" IS NULL;

UPDATE "ProductMaterialCost" c SET "workspaceId" = p."workspaceId"
FROM "Product" p
WHERE c."productId" = p."id" AND c."workspaceId" IS NULL;

UPDATE "PackageProfile" p SET "workspaceId" = a."workspaceId"
FROM "LegacyWorkspaceAssignment" a
WHERE a."sourceKey" = 'MARMARAMADE_LEDGER' AND p."workspaceId" IS NULL;

UPDATE "FeeProfile" f SET "workspaceId" = a."workspaceId"
FROM "LegacyWorkspaceAssignment" a
WHERE a."sourceKey" = 'MARMARAMADE_LEDGER' AND f."workspaceId" IS NULL;

UPDATE "ExchangeRateSnapshot" r SET "workspaceId" = a."workspaceId"
FROM "LegacyWorkspaceAssignment" a
WHERE a."sourceKey" = 'MARMARAMADE_LEDGER' AND r."workspaceId" IS NULL;

UPDATE "Scenario" s SET "workspaceId" = a."workspaceId"
FROM "LegacyWorkspaceAssignment" a
WHERE a."sourceKey" = 'MARMARAMADE_LEDGER' AND s."workspaceId" IS NULL;

UPDATE "EtsyConnection" c
SET "workspaceId" = s."workspaceId", "saasShopId" = s."id"
FROM "Shop" s
WHERE s."platform" = 'ETSY' AND s."externalShopId" = c."shopId"
  AND c."workspaceId" IS NULL;

UPDATE "EtsySyncRun" r
SET "workspaceId" = c."workspaceId", "shopId" = c."saasShopId"
FROM "EtsyConnection" c
WHERE r."connectionId" = c."id" AND r."workspaceId" IS NULL;

UPDATE "EtsySyncError" e
SET "workspaceId" = r."workspaceId", "shopId" = r."shopId"
FROM "EtsySyncRun" r
WHERE e."syncRunId" = r."id" AND e."workspaceId" IS NULL;

UPDATE "EtsyListing" l
SET "workspaceId" = c."workspaceId", "shopId" = c."saasShopId"
FROM "EtsyConnection" c
WHERE l."connectionId" = c."id" AND l."workspaceId" IS NULL;

UPDATE "EtsyListingImage" i
SET "workspaceId" = l."workspaceId", "shopId" = l."shopId", "listingId" = l."id"
FROM "EtsyListing" l
WHERE i."etsyListingId" = l."etsyListingId" AND i."workspaceId" IS NULL;

UPDATE "EtsyListingProductLink" x
SET "workspaceId" = l."workspaceId", "shopId" = l."shopId", "listingId" = l."id"
FROM "EtsyListing" l
WHERE x."etsyListingId" = l."etsyListingId" AND x."workspaceId" IS NULL;

UPDATE "EtsyReceipt" r
SET "workspaceId" = c."workspaceId", "shopId" = c."saasShopId"
FROM "EtsyConnection" c
WHERE r."connectionId" = c."id" AND r."workspaceId" IS NULL;

UPDATE "EtsyReceiptItem" i
SET "workspaceId" = r."workspaceId", "shopId" = r."shopId", "receiptRecordId" = r."id"
FROM "EtsyReceipt" r
WHERE i."etsyReceiptId" = r."etsyReceiptId" AND i."workspaceId" IS NULL;

UPDATE "EtsyReceiptItem" i
SET "listingRecordId" = l."id"
FROM "EtsyListing" l
WHERE i."shopId" = l."shopId" AND i."etsyListingId" = l."etsyListingId"
  AND i."listingRecordId" IS NULL;

UPDATE "EtsyPayment" p
SET "workspaceId" = c."workspaceId", "shopId" = c."saasShopId"
FROM "EtsyConnection" c
WHERE p."connectionId" = c."id" AND p."workspaceId" IS NULL;

UPDATE "EtsyPayment" p
SET "receiptRecordId" = r."id"
FROM "EtsyReceipt" r
WHERE p."shopId" = r."shopId" AND p."etsyReceiptId" = r."etsyReceiptId"
  AND p."receiptRecordId" IS NULL;

UPDATE "EtsyLedgerEntry" e
SET "workspaceId" = c."workspaceId", "shopId" = c."saasShopId"
FROM "EtsyConnection" c
WHERE e."connectionId" = c."id" AND e."workspaceId" IS NULL;

UPDATE "EtsyWebhookEvent" e
SET "workspaceId" = s."workspaceId", "saasShopId" = s."id"
FROM "Shop" s
WHERE s."platform" = 'ETSY' AND e."shopId" = s."externalShopId"
  AND e."workspaceId" IS NULL;

-- A global import mapping is assignable only when the legacy assignment has one
-- Etsy shop. Otherwise it intentionally remains nullable for the report.
UPDATE "EtsyImportMapping" m
SET "workspaceId" = one_shop."workspaceId", "shopId" = one_shop."id"
FROM (
    SELECT MIN("id") AS "id", MIN("workspaceId") AS "workspaceId"
    FROM "Shop"
    WHERE "platform" = 'ETSY'
    HAVING COUNT(*) = 1
) one_shop
WHERE m."workspaceId" IS NULL;

UPDATE "EtsyOAuthState" o SET "workspaceId" = a."workspaceId"
FROM "LegacyWorkspaceAssignment" a
WHERE a."sourceKey" = 'MARMARAMADE_LEDGER' AND o."workspaceId" IS NULL;

UPDATE "Order" o SET "workspaceId" = a."workspaceId"
FROM "LegacyWorkspaceAssignment" a
WHERE a."sourceKey" = 'MARMARAMADE_LEDGER' AND o."workspaceId" IS NULL;

UPDATE "Order" o SET "shopId" = r."shopId"
FROM "EtsyReceipt" r
WHERE r."localOrderId" = o."id" AND o."shopId" IS NULL;

UPDATE "OrderItem" i SET "workspaceId" = o."workspaceId"
FROM "Order" o WHERE i."orderId" = o."id" AND i."workspaceId" IS NULL;

UPDATE "OrderCostSnapshot" s SET "workspaceId" = o."workspaceId"
FROM "Order" o WHERE s."orderId" = o."id" AND s."workspaceId" IS NULL;

UPDATE "OrderCostLine" l SET "workspaceId" = s."workspaceId"
FROM "OrderCostSnapshot" s
WHERE l."orderCostSnapshotId" = s."id" AND l."workspaceId" IS NULL;

UPDATE "OrderAdjustment" x SET "workspaceId" = o."workspaceId"
FROM "Order" o WHERE x."orderId" = o."id" AND x."workspaceId" IS NULL;

-- Validate all contracted keys before any obsolete global unique index is
-- removed. Existing global indexes remain in place throughout this check.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Product" WHERE "workspaceId" IS NOT NULL GROUP BY "workspaceId", "sku" HAVING COUNT(*) > 1) OR
       EXISTS (SELECT 1 FROM "Order" WHERE "workspaceId" IS NOT NULL GROUP BY "workspaceId", "orderNumber" HAVING COUNT(*) > 1) OR
       EXISTS (SELECT 1 FROM "EtsyListing" WHERE "shopId" IS NOT NULL GROUP BY "shopId", "etsyListingId" HAVING COUNT(*) > 1) OR
       EXISTS (SELECT 1 FROM "EtsyReceipt" WHERE "shopId" IS NOT NULL GROUP BY "shopId", "etsyReceiptId" HAVING COUNT(*) > 1) OR
       EXISTS (SELECT 1 FROM "EtsyPayment" WHERE "shopId" IS NOT NULL GROUP BY "shopId", "etsyPaymentId" HAVING COUNT(*) > 1) OR
       EXISTS (SELECT 1 FROM "EtsyLedgerEntry" WHERE "shopId" IS NOT NULL GROUP BY "shopId", "etsyLedgerEntryId" HAVING COUNT(*) > 1) THEN
        RAISE EXCEPTION 'Prompt 3 workspace/shop uniqueness collision detected';
    END IF;
END $$;

-- CreateIndex
CREATE INDEX "Shop_workspaceId_platform_status_idx" ON "Shop"("workspaceId", "platform", "status");

-- CreateIndex
CREATE INDEX "WorkspaceSetting_workspaceId_updatedAt_idx" ON "WorkspaceSetting"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSetting_workspaceId_key_key" ON "WorkspaceSetting"("workspaceId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceBusinessProfile_workspaceId_key" ON "WorkspaceBusinessProfile"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceBusinessProfileVersion_workspaceBusinessProfileId__idx" ON "WorkspaceBusinessProfileVersion"("workspaceBusinessProfileId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceBusinessProfileVersion_profile_version_key" ON "WorkspaceBusinessProfileVersion"("workspaceBusinessProfileId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceBusinessProfileVersion_profile_effective_key" ON "WorkspaceBusinessProfileVersion"("workspaceBusinessProfileId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "WorkspaceCostDefaultVersion_workspaceId_effectiveFrom_effec_idx" ON "WorkspaceCostDefaultVersion"("workspaceId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceCostDefaultVersion_workspaceId_versionNumber_key" ON "WorkspaceCostDefaultVersion"("workspaceId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceCostDefaultVersion_workspaceId_effectiveFrom_key" ON "WorkspaceCostDefaultVersion"("workspaceId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PortfolioScenario_workspaceId_createdAt_idx" ON "PortfolioScenario"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PortfolioScenarioVersion_workspaceId_createdAt_idx" ON "PortfolioScenarioVersion"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioScenarioVersion_scenarioId_versionNumber_key" ON "PortfolioScenarioVersion"("scenarioId", "versionNumber");

-- CreateIndex
CREATE INDEX "PortfolioScenarioItem_productId_idx" ON "PortfolioScenarioItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioScenarioItem_scenarioVersionId_productId_key" ON "PortfolioScenarioItem"("scenarioVersionId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioScenarioAssumption_scenarioVersionId_key_key" ON "PortfolioScenarioAssumption"("scenarioVersionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioScenarioResult_scenarioVersionId_key" ON "PortfolioScenarioResult"("scenarioVersionId");

-- CreateIndex
CREATE INDEX "PortfolioScenarioResultLine_scenarioResultId_category_idx" ON "PortfolioScenarioResultLine"("scenarioResultId", "category");

-- CreateIndex
CREATE INDEX "PortfolioScenarioResultLine_scenarioItemId_idx" ON "PortfolioScenarioResultLine"("scenarioItemId");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyConnection_saasShopId_key" ON "EtsyConnection"("saasShopId");

-- CreateIndex
CREATE INDEX "EtsyConnection_workspaceId_status_idx" ON "EtsyConnection"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "EtsyImportMapping_workspaceId_idx" ON "EtsyImportMapping"("workspaceId");

-- CreateIndex
CREATE INDEX "EtsyImportMapping_shopId_idx" ON "EtsyImportMapping"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyImportMapping_shopId_originalType_originalDescription_key" ON "EtsyImportMapping"("shopId", "originalType", "originalDescription");

-- CreateIndex
CREATE INDEX "EtsyLedgerEntry_workspaceId_sourceCreatedAt_idx" ON "EtsyLedgerEntry"("workspaceId", "sourceCreatedAt");

-- CreateIndex
CREATE INDEX "EtsyLedgerEntry_shopId_sourceCreatedAt_idx" ON "EtsyLedgerEntry"("shopId", "sourceCreatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyLedgerEntry_shopId_etsyLedgerEntryId_key" ON "EtsyLedgerEntry"("shopId", "etsyLedgerEntryId");

-- CreateIndex
CREATE INDEX "EtsyListing_workspaceId_state_idx" ON "EtsyListing"("workspaceId", "state");

-- CreateIndex
CREATE INDEX "EtsyListing_shopId_state_idx" ON "EtsyListing"("shopId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyListing_shopId_etsyListingId_key" ON "EtsyListing"("shopId", "etsyListingId");

-- CreateIndex
CREATE INDEX "EtsyListingImage_listingId_rank_idx" ON "EtsyListingImage"("listingId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyListingImage_shopId_etsyImageId_key" ON "EtsyListingImage"("shopId", "etsyImageId");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyListingProductLink_listingId_key" ON "EtsyListingProductLink"("listingId");

-- CreateIndex
CREATE INDEX "EtsyListingProductLink_workspaceId_idx" ON "EtsyListingProductLink"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyListingProductLink_shopId_etsyListingId_key" ON "EtsyListingProductLink"("shopId", "etsyListingId");

-- CreateIndex
CREATE INDEX "EtsyOAuthState_workspaceId_expiresAt_consumedAt_idx" ON "EtsyOAuthState"("workspaceId", "expiresAt", "consumedAt");

-- CreateIndex
CREATE INDEX "EtsyOAuthState_shopId_idx" ON "EtsyOAuthState"("shopId");

-- CreateIndex
CREATE INDEX "EtsyPayment_receiptRecordId_idx" ON "EtsyPayment"("receiptRecordId");

-- CreateIndex
CREATE INDEX "EtsyPayment_workspaceId_paidAt_idx" ON "EtsyPayment"("workspaceId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyPayment_shopId_etsyPaymentId_key" ON "EtsyPayment"("shopId", "etsyPaymentId");

-- CreateIndex
CREATE INDEX "EtsyReceipt_workspaceId_sourceCreatedAt_idx" ON "EtsyReceipt"("workspaceId", "sourceCreatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyReceipt_shopId_etsyReceiptId_key" ON "EtsyReceipt"("shopId", "etsyReceiptId");

-- CreateIndex
CREATE INDEX "EtsyReceiptItem_receiptRecordId_idx" ON "EtsyReceiptItem"("receiptRecordId");

-- CreateIndex
CREATE INDEX "EtsyReceiptItem_listingRecordId_idx" ON "EtsyReceiptItem"("listingRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyReceiptItem_shopId_etsyTransactionId_key" ON "EtsyReceiptItem"("shopId", "etsyTransactionId");

-- CreateIndex
CREATE INDEX "EtsySyncError_workspaceId_createdAt_idx" ON "EtsySyncError"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "EtsySyncError_shopId_createdAt_idx" ON "EtsySyncError"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "EtsySyncRun_workspaceId_startedAt_idx" ON "EtsySyncRun"("workspaceId", "startedAt");

-- CreateIndex
CREATE INDEX "EtsySyncRun_shopId_startedAt_idx" ON "EtsySyncRun"("shopId", "startedAt");

-- CreateIndex
CREATE INDEX "EtsyWebhookEvent_workspaceId_createdAt_idx" ON "EtsyWebhookEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "EtsyWebhookEvent_saasShopId_createdAt_idx" ON "EtsyWebhookEvent"("saasShopId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyWebhookEvent_saasShopId_webhookId_key" ON "EtsyWebhookEvent"("saasShopId", "webhookId");

-- CreateIndex
CREATE INDEX "ExchangeRateSnapshot_workspaceId_capturedAt_idx" ON "ExchangeRateSnapshot"("workspaceId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRateSnapshot_workspaceId_baseCurrency_quoteCurrency_key" ON "ExchangeRateSnapshot"("workspaceId", "baseCurrency", "quoteCurrency", "capturedAt");

-- CreateIndex
CREATE INDEX "FeeProfile_workspaceId_effectiveFrom_effectiveTo_idx" ON "FeeProfile"("workspaceId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "FeeProfile_workspaceId_marketplace_country_effectiveFrom_key" ON "FeeProfile"("workspaceId", "marketplace", "country", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Order_workspaceId_orderDate_idx" ON "Order"("workspaceId", "orderDate");

-- CreateIndex
CREATE INDEX "Order_shopId_orderDate_idx" ON "Order"("shopId", "orderDate");

-- CreateIndex
CREATE UNIQUE INDEX "Order_workspaceId_orderNumber_key" ON "Order"("workspaceId", "orderNumber");

-- CreateIndex
CREATE INDEX "OrderAdjustment_workspaceId_orderId_idx" ON "OrderAdjustment"("workspaceId", "orderId");

-- CreateIndex
CREATE INDEX "OrderCostLine_workspaceId_orderCostSnapshotId_idx" ON "OrderCostLine"("workspaceId", "orderCostSnapshotId");

-- CreateIndex
CREATE INDEX "OrderCostSnapshot_workspaceId_orderId_calculatedAt_idx" ON "OrderCostSnapshot"("workspaceId", "orderId", "calculatedAt");

-- CreateIndex
CREATE INDEX "OrderItem_workspaceId_orderId_idx" ON "OrderItem"("workspaceId", "orderId");

-- CreateIndex
CREATE INDEX "PackageProfile_workspaceId_idx" ON "PackageProfile"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PackageProfile_workspaceId_name_key" ON "PackageProfile"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Product_workspaceId_active_idx" ON "Product"("workspaceId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Product_workspaceId_sku_key" ON "Product"("workspaceId", "sku");

-- CreateIndex
CREATE INDEX "ProductCostVersion_workspaceId_effectiveFrom_effectiveTo_idx" ON "ProductCostVersion"("workspaceId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "ProductMaterialCost_workspaceId_productId_idx" ON "ProductMaterialCost"("workspaceId", "productId");

-- CreateIndex
CREATE INDEX "Scenario_workspaceId_createdAt_idx" ON "Scenario"("workspaceId", "createdAt");

-- Enforce one explicitly active version while retaining all history. PostgreSQL
-- permits multiple NULL values, so historical versions keep activeKey NULL.
CREATE UNIQUE INDEX "WorkspaceBusinessProfileVersion_one_active_key"
ON "WorkspaceBusinessProfileVersion"("workspaceBusinessProfileId", "activeKey");

CREATE UNIQUE INDEX "WorkspaceCostDefaultVersion_one_active_key"
ON "WorkspaceCostDefaultVersion"("workspaceId", "activeKey");

-- Contract only after compound constraints exist and collision checks passed.
ALTER TABLE "EtsyListingImage" DROP CONSTRAINT "EtsyListingImage_etsyListingId_fkey";
ALTER TABLE "EtsyListingProductLink" DROP CONSTRAINT "EtsyListingProductLink_etsyListingId_fkey";
ALTER TABLE "EtsyPayment" DROP CONSTRAINT "EtsyPayment_etsyReceiptId_fkey";
ALTER TABLE "EtsyReceiptItem" DROP CONSTRAINT "EtsyReceiptItem_etsyListingId_fkey";
ALTER TABLE "EtsyReceiptItem" DROP CONSTRAINT "EtsyReceiptItem_etsyReceiptId_fkey";

DROP INDEX "EtsyImportMapping_originalType_originalDescription_key";
DROP INDEX "EtsyLedgerEntry_etsyLedgerEntryId_key";
DROP INDEX "EtsyListing_etsyListingId_key";
DROP INDEX "EtsyListingImage_etsyImageId_key";
DROP INDEX "EtsyListingProductLink_etsyListingId_key";
DROP INDEX "EtsyPayment_etsyPaymentId_key";
DROP INDEX "EtsyReceipt_etsyReceiptId_key";
DROP INDEX "EtsyReceiptItem_etsyTransactionId_key";
DROP INDEX "EtsyWebhookEvent_webhookId_key";
DROP INDEX "ExchangeRateSnapshot_baseCurrency_quoteCurrency_capturedAt_key";
DROP INDEX "FeeProfile_marketplace_country_effectiveFrom_key";
DROP INDEX "Order_orderNumber_key";
DROP INDEX "PackageProfile_name_key";
DROP INDEX "Product_sku_key";

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCostVersion" ADD CONSTRAINT "ProductCostVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageProfile" ADD CONSTRAINT "PackageProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeProfile" ADD CONSTRAINT "FeeProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRateSnapshot" ADD CONSTRAINT "ExchangeRateSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCostSnapshot" ADD CONSTRAINT "OrderCostSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCostLine" ADD CONSTRAINT "OrderCostLine_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSetting" ADD CONSTRAINT "WorkspaceSetting_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceBusinessProfile" ADD CONSTRAINT "WorkspaceBusinessProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceBusinessProfileVersion" ADD CONSTRAINT "WorkspaceBusinessProfileVersion_workspaceBusinessProfileId_fkey" FOREIGN KEY ("workspaceBusinessProfileId") REFERENCES "WorkspaceBusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceCostDefaultVersion" ADD CONSTRAINT "WorkspaceCostDefaultVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenario" ADD CONSTRAINT "PortfolioScenario_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioVersion" ADD CONSTRAINT "PortfolioScenarioVersion_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "PortfolioScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioVersion" ADD CONSTRAINT "PortfolioScenarioVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioVersion" ADD CONSTRAINT "PortfolioScenarioVersion_exchangeRateSnapshotId_fkey" FOREIGN KEY ("exchangeRateSnapshotId") REFERENCES "ExchangeRateSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioVersion" ADD CONSTRAINT "PortfolioScenarioVersion_feeProfileId_fkey" FOREIGN KEY ("feeProfileId") REFERENCES "FeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioVersion" ADD CONSTRAINT "PortfolioScenarioVersion_businessProfileVersionId_fkey" FOREIGN KEY ("businessProfileVersionId") REFERENCES "WorkspaceBusinessProfileVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioVersion" ADD CONSTRAINT "PortfolioScenarioVersion_costDefaultVersionId_fkey" FOREIGN KEY ("costDefaultVersionId") REFERENCES "WorkspaceCostDefaultVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioItem" ADD CONSTRAINT "PortfolioScenarioItem_scenarioVersionId_fkey" FOREIGN KEY ("scenarioVersionId") REFERENCES "PortfolioScenarioVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioItem" ADD CONSTRAINT "PortfolioScenarioItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioAssumption" ADD CONSTRAINT "PortfolioScenarioAssumption_scenarioVersionId_fkey" FOREIGN KEY ("scenarioVersionId") REFERENCES "PortfolioScenarioVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioResult" ADD CONSTRAINT "PortfolioScenarioResult_scenarioVersionId_fkey" FOREIGN KEY ("scenarioVersionId") REFERENCES "PortfolioScenarioVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioResultLine" ADD CONSTRAINT "PortfolioScenarioResultLine_scenarioResultId_fkey" FOREIGN KEY ("scenarioResultId") REFERENCES "PortfolioScenarioResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioScenarioResultLine" ADD CONSTRAINT "PortfolioScenarioResultLine_scenarioItemId_fkey" FOREIGN KEY ("scenarioItemId") REFERENCES "PortfolioScenarioItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyConnection" ADD CONSTRAINT "EtsyConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyConnection" ADD CONSTRAINT "EtsyConnection_saasShopId_fkey" FOREIGN KEY ("saasShopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyOAuthState" ADD CONSTRAINT "EtsyOAuthState_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyOAuthState" ADD CONSTRAINT "EtsyOAuthState_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsySyncRun" ADD CONSTRAINT "EtsySyncRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsySyncRun" ADD CONSTRAINT "EtsySyncRun_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsySyncError" ADD CONSTRAINT "EtsySyncError_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsySyncError" ADD CONSTRAINT "EtsySyncError_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListing" ADD CONSTRAINT "EtsyListing_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListing" ADD CONSTRAINT "EtsyListing_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListingImage" ADD CONSTRAINT "EtsyListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "EtsyListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListingImage" ADD CONSTRAINT "EtsyListingImage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListingImage" ADD CONSTRAINT "EtsyListingImage_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListingProductLink" ADD CONSTRAINT "EtsyListingProductLink_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "EtsyListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListingProductLink" ADD CONSTRAINT "EtsyListingProductLink_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListingProductLink" ADD CONSTRAINT "EtsyListingProductLink_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyReceipt" ADD CONSTRAINT "EtsyReceipt_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyReceipt" ADD CONSTRAINT "EtsyReceipt_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyReceiptItem" ADD CONSTRAINT "EtsyReceiptItem_receiptRecordId_fkey" FOREIGN KEY ("receiptRecordId") REFERENCES "EtsyReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyReceiptItem" ADD CONSTRAINT "EtsyReceiptItem_listingRecordId_fkey" FOREIGN KEY ("listingRecordId") REFERENCES "EtsyListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyReceiptItem" ADD CONSTRAINT "EtsyReceiptItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyReceiptItem" ADD CONSTRAINT "EtsyReceiptItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyPayment" ADD CONSTRAINT "EtsyPayment_receiptRecordId_fkey" FOREIGN KEY ("receiptRecordId") REFERENCES "EtsyReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyPayment" ADD CONSTRAINT "EtsyPayment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyPayment" ADD CONSTRAINT "EtsyPayment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyLedgerEntry" ADD CONSTRAINT "EtsyLedgerEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyLedgerEntry" ADD CONSTRAINT "EtsyLedgerEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyWebhookEvent" ADD CONSTRAINT "EtsyWebhookEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyWebhookEvent" ADD CONSTRAINT "EtsyWebhookEvent_saasShopId_fkey" FOREIGN KEY ("saasShopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyImportMapping" ADD CONSTRAINT "EtsyImportMapping_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyImportMapping" ADD CONSTRAINT "EtsyImportMapping_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaterialCost" ADD CONSTRAINT "ProductMaterialCost_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAdjustment" ADD CONSTRAINT "OrderAdjustment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "TariffVersion_productId_hsCode_originCountry_destinationCountry" RENAME TO "TariffVersion_productId_hsCode_originCountry_destinationCou_key";
