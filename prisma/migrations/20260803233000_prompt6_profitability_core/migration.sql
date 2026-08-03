-- Prompt 6 adds immutable SaaS profitability records and versioned logistics
-- assumptions. Existing Ledger order snapshots and source records are untouched.
CREATE TYPE "ProfitCalculationStatus" AS ENUM ('COMPLETE', 'ESTIMATED', 'INCOMPLETE', 'NEEDS_REVIEW');

CREATE TABLE "WorkspaceShippingDefaultVersion" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "destinationCountry" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "activeKey" TEXT,
  "shippingCost" DECIMAL(65,30),
  "shippingCurrency" TEXT NOT NULL,
  "customsResponsibility" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "sellerPaidCustomsCost" DECIMAL(65,30),
  "customsCurrency" TEXT,
  "targetMarginPercent" DECIMAL(65,30) NOT NULL DEFAULT 20,
  "source" TEXT NOT NULL DEFAULT 'MANUAL_WORKSPACE_SETTING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceShippingDefaultVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductShippingOverrideVersion" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "destinationCountry" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "activeKey" TEXT,
  "shippingCost" DECIMAL(65,30),
  "shippingCurrency" TEXT NOT NULL,
  "customsResponsibility" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "sellerPaidCustomsCost" DECIMAL(65,30),
  "customsCurrency" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL_PRODUCT_OVERRIDE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductShippingOverrideVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductProfitSnapshot" (
  "id" TEXT NOT NULL,
  "calculationKey" TEXT,
  "workspaceId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "listingId" TEXT,
  "destinationCountry" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
  "listingPrice" DECIMAL(65,30) NOT NULL,
  "listingCurrency" TEXT NOT NULL,
  "reportingCurrency" TEXT NOT NULL,
  "status" "ProfitCalculationStatus" NOT NULL,
  "completenessScore" INTEGER NOT NULL,
  "inputSnapshot" JSONB NOT NULL,
  "resultSnapshot" JSONB NOT NULL,
  "feeProfileId" TEXT,
  "productCostVersionId" TEXT,
  "costDefaultVersionId" TEXT,
  "businessProfileVersionId" TEXT,
  "exchangeRateSnapshotId" TEXT,
  "shippingDefaultVersionId" TEXT,
  "shippingOverrideVersionId" TEXT,
  "grossRevenue" DECIMAL(65,30),
  "etsyFees" DECIMAL(65,30),
  "productCashCost" DECIMAL(65,30),
  "economicLabourCost" DECIMAL(65,30),
  "shippingCost" DECIMAL(65,30),
  "customsExposure" DECIMAL(65,30),
  "preTaxCashProfit" DECIMAL(65,30),
  "taxReserve" DECIMAL(65,30),
  "finalCashProfit" DECIMAL(65,30),
  "economicProfit" DECIMAL(65,30),
  "cashMarginPercent" DECIMAL(65,30),
  "economicMarginPercent" DECIMAL(65,30),
  "warnings" JSONB NOT NULL,
  "engineVersion" TEXT NOT NULL DEFAULT 'product-profit-v1',
  "supersedesSnapshotId" TEXT,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductProfitSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceShippingDefaultVersion_workspace_destination_version_key"
  ON "WorkspaceShippingDefaultVersion"("workspaceId", "destinationCountry", "versionNumber");
CREATE UNIQUE INDEX "WorkspaceShippingDefaultVersion_one_active_key"
  ON "WorkspaceShippingDefaultVersion"("workspaceId", "destinationCountry", "activeKey");
CREATE INDEX "WorkspaceShippingDefaultVersion_workspace_destination_effective_idx"
  ON "WorkspaceShippingDefaultVersion"("workspaceId", "destinationCountry", "effectiveFrom", "effectiveTo");

CREATE UNIQUE INDEX "ProductShippingOverrideVersion_product_destination_version_key"
  ON "ProductShippingOverrideVersion"("productId", "destinationCountry", "versionNumber");
CREATE UNIQUE INDEX "ProductShippingOverrideVersion_one_active_key"
  ON "ProductShippingOverrideVersion"("productId", "destinationCountry", "activeKey");
CREATE INDEX "ProductShippingOverrideVersion_workspace_destination_effective_idx"
  ON "ProductShippingOverrideVersion"("workspaceId", "destinationCountry", "effectiveFrom", "effectiveTo");

CREATE INDEX "ProductProfitSnapshot_workspace_product_calculated_idx"
  ON "ProductProfitSnapshot"("workspaceId", "productId", "calculatedAt");
CREATE INDEX "ProductProfitSnapshot_workspace_status_calculated_idx"
  ON "ProductProfitSnapshot"("workspaceId", "status", "calculatedAt");
CREATE INDEX "ProductProfitSnapshot_listing_calculated_idx"
  ON "ProductProfitSnapshot"("listingId", "calculatedAt");
CREATE UNIQUE INDEX "ProductProfitSnapshot_calculationKey_key"
  ON "ProductProfitSnapshot"("calculationKey");

ALTER TABLE "WorkspaceShippingDefaultVersion" ADD CONSTRAINT "WorkspaceShippingDefaultVersion_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductShippingOverrideVersion" ADD CONSTRAINT "ProductShippingOverrideVersion_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductShippingOverrideVersion" ADD CONSTRAINT "ProductShippingOverrideVersion_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductProfitSnapshot" ADD CONSTRAINT "ProductProfitSnapshot_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductProfitSnapshot" ADD CONSTRAINT "ProductProfitSnapshot_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductProfitSnapshot" ADD CONSTRAINT "ProductProfitSnapshot_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "EtsyListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductProfitSnapshot" ADD CONSTRAINT "ProductProfitSnapshot_supersedesSnapshotId_fkey"
  FOREIGN KEY ("supersedesSnapshotId") REFERENCES "ProductProfitSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
