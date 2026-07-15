-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "material" TEXT,
    "description" TEXT,
    "hsCode" TEXT,
    "widthCm" DECIMAL,
    "heightCm" DECIMAL,
    "handleLengthCm" DECIMAL,
    "productWeightGrams" DECIMAL,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "lining" BOOLEAN NOT NULL DEFAULT false,
    "interiorPocket" BOOLEAN NOT NULL DEFAULT false,
    "closureType" TEXT,
    "baseType" TEXT,
    "oneOfOne" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductCostVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "materialCostTry" DECIMAL NOT NULL,
    "laborHours" DECIMAL NOT NULL,
    "laborHourlyRateTry" DECIMAL NOT NULL,
    "packagingCostTry" DECIMAL NOT NULL,
    "additionalDirectCostTry" DECIMAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductCostVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackageProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "lengthCm" DECIMAL NOT NULL,
    "widthCm" DECIMAL NOT NULL,
    "heightCm" DECIMAL NOT NULL,
    "actualWeightKg" DECIMAL NOT NULL,
    "volumetricDivisor" DECIMAL NOT NULL DEFAULT 5000,
    "packagingCostTry" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Marketplace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FeeProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketplace" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "listingCurrency" TEXT NOT NULL,
    "payoutCurrency" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FeeRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feeProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL,
    "percentageRate" DECIMAL,
    "fixedAmount" DECIMAL,
    "fixedCurrency" TEXT,
    "calculationBase" TEXT,
    "vatApplicable" BOOLEAN NOT NULL DEFAULT false,
    "vatRate" DECIMAL NOT NULL DEFAULT 0,
    "minimumAmount" DECIMAL,
    "maximumAmount" DECIMAL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "sourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeeRule_feeProfileId_fkey" FOREIGN KEY ("feeProfileId") REFERENCES "FeeProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessProfileVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "businessStatus" TEXT NOT NULL,
    "vatIdSubmittedToEtsy" BOOLEAN NOT NULL,
    "etsyVatTreatment" TEXT NOT NULL,
    "sellerFeeVatRate" DECIMAL NOT NULL,
    "accountantMonthlyTry" DECIMAL NOT NULL,
    "socialSecurityMonthlyTry" DECIMAL NOT NULL,
    "invoicingSoftwareMonthlyTry" DECIMAL NOT NULL,
    "bankingMonthlyTry" DECIMAL NOT NULL,
    "officeMonthlyTry" DECIMAL NOT NULL,
    "otherMonthlyBusinessCostsTry" DECIMAL NOT NULL,
    "expectedMonthlyOrders" INTEGER NOT NULL,
    "overheadAllocationMethod" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShippingQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originCountry" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "destinationRegion" TEXT,
    "carrier" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "incoterm" TEXT NOT NULL,
    "packageLengthCm" DECIMAL NOT NULL,
    "packageWidthCm" DECIMAL NOT NULL,
    "packageHeightCm" DECIMAL NOT NULL,
    "actualWeightKg" DECIMAL NOT NULL,
    "volumetricDivisor" DECIMAL NOT NULL,
    "volumetricWeightKg" DECIMAL NOT NULL,
    "billableWeightKg" DECIMAL NOT NULL,
    "shippingCost" DECIMAL NOT NULL,
    "shippingCurrency" TEXT NOT NULL,
    "insuranceCost" DECIMAL NOT NULL,
    "fuelSurcharge" DECIMAL NOT NULL,
    "remoteAreaFee" DECIMAL NOT NULL,
    "pickupFee" DECIMAL NOT NULL,
    "otherCarrierFees" DECIMAL NOT NULL,
    "quoteDate" DATETIME NOT NULL,
    "expirationDate" DATETIME,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomsQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originCountry" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "hsCode" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL,
    "countryOfOrigin" TEXT NOT NULL,
    "declaredValue" DECIMAL NOT NULL,
    "declaredValueCurrency" TEXT NOT NULL,
    "customsDutyRate" DECIMAL NOT NULL,
    "customsDutyAmount" DECIMAL,
    "additionalTariffRate" DECIMAL NOT NULL,
    "additionalTariffAmount" DECIMAL,
    "carrierProcessingFee" DECIMAL NOT NULL,
    "brokerageFee" DECIMAL NOT NULL,
    "customsClearanceFee" DECIMAL NOT NULL,
    "insuranceFee" DECIMAL NOT NULL,
    "otherDestinationFee" DECIMAL NOT NULL,
    "quoteDate" DATETIME NOT NULL,
    "expirationDate" DATETIME,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExchangeRateSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "source" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "orderDate" DATETIME NOT NULL,
    "marketplace" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "destinationRegion" TEXT,
    "currency" TEXT NOT NULL,
    "orderStatus" TEXT NOT NULL,
    "offsiteAdAttributed" BOOLEAN NOT NULL DEFAULT false,
    "trailingEtsyRevenueUsd" DECIMAL NOT NULL DEFAULT 0,
    "currencyConversionRequired" BOOLEAN NOT NULL DEFAULT true,
    "depositFeeApplies" BOOLEAN NOT NULL DEFAULT false,
    "businessProfileVersionId" TEXT NOT NULL,
    "feeProfileId" TEXT NOT NULL,
    "exchangeRateSnapshotId" TEXT NOT NULL,
    "shippingQuoteId" TEXT,
    "customsQuoteId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_businessProfileVersionId_fkey" FOREIGN KEY ("businessProfileVersionId") REFERENCES "BusinessProfileVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_feeProfileId_fkey" FOREIGN KEY ("feeProfileId") REFERENCES "FeeProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_exchangeRateSnapshotId_fkey" FOREIGN KEY ("exchangeRateSnapshotId") REFERENCES "ExchangeRateSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_shippingQuoteId_fkey" FOREIGN KEY ("shippingQuoteId") REFERENCES "ShippingQuote" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_customsQuoteId_fkey" FOREIGN KEY ("customsQuoteId") REFERENCES "CustomsQuote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "unitCurrency" TEXT NOT NULL,
    "sellerFundedDiscount" DECIMAL NOT NULL,
    "etsyFundedDiscount" DECIMAL NOT NULL,
    "shippingAllocated" DECIMAL NOT NULL,
    "giftWrapAllocated" DECIMAL NOT NULL,
    "taxCollectedByMarketplace" DECIMAL NOT NULL,
    "productCostVersionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productCostVersionId_fkey" FOREIGN KEY ("productCostVersionId") REFERENCES "ProductCostVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderCostSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "businessProfileVersionId" TEXT NOT NULL,
    "feeProfileId" TEXT NOT NULL,
    "exchangeRateSnapshotId" TEXT NOT NULL,
    "grossRevenueUsd" DECIMAL NOT NULL,
    "totalCostUsd" DECIMAL NOT NULL,
    "totalCostTry" DECIMAL NOT NULL,
    "estimatedProfitUsd" DECIMAL NOT NULL,
    "estimatedProfitTry" DECIMAL NOT NULL,
    "assumptionsJson" TEXT NOT NULL,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderCostSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderCostSnapshot_businessProfileVersionId_fkey" FOREIGN KEY ("businessProfileVersionId") REFERENCES "BusinessProfileVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderCostSnapshot_feeProfileId_fkey" FOREIGN KEY ("feeProfileId") REFERENCES "FeeProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderCostSnapshot_exchangeRateSnapshotId_fkey" FOREIGN KEY ("exchangeRateSnapshotId") REFERENCES "ExchangeRateSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderCostLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderCostSnapshotId" TEXT NOT NULL,
    "formulaName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "calculationBase" DECIMAL,
    "rate" DECIMAL,
    "fixedAmount" DECIMAL,
    "sourceAmount" DECIMAL NOT NULL,
    "sourceCurrency" TEXT NOT NULL,
    "convertedAmountUsd" DECIMAL NOT NULL,
    "convertedAmountTry" DECIMAL NOT NULL,
    "exchangeRateUsed" DECIMAL NOT NULL,
    "applicableProfileName" TEXT,
    "applicableFeeVersion" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderCostLine_orderCostSnapshotId_fkey" FOREIGN KEY ("orderCostSnapshotId") REFERENCES "OrderCostSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "inputsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScenarioResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "grossRevenueUsd" DECIMAL NOT NULL,
    "estimatedProfitUsd" DECIMAL NOT NULL,
    "estimatedProfitTry" DECIMAL NOT NULL,
    "contributionMargin" DECIMAL NOT NULL,
    "operatingMargin" DECIMAL NOT NULL,
    "afterReserveMargin" DECIMAL NOT NULL,
    "calculationSnapshotJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScenarioResult_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyOverhead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" DATETIME NOT NULL,
    "accountantTry" DECIMAL NOT NULL,
    "socialSecurityTry" DECIMAL NOT NULL,
    "softwareTry" DECIMAL NOT NULL,
    "bankingTry" DECIMAL NOT NULL,
    "officeTry" DECIMAL NOT NULL,
    "otherTry" DECIMAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "actor" TEXT NOT NULL DEFAULT 'local-user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE INDEX "ProductCostVersion_productId_effectiveFrom_effectiveTo_idx" ON "ProductCostVersion"("productId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCostVersion_productId_effectiveFrom_key" ON "ProductCostVersion"("productId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PackageProfile_name_key" ON "PackageProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Marketplace_name_key" ON "Marketplace"("name");

-- CreateIndex
CREATE INDEX "FeeProfile_effectiveFrom_effectiveTo_idx" ON "FeeProfile"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "FeeProfile_marketplace_country_effectiveFrom_key" ON "FeeProfile"("marketplace", "country", "effectiveFrom");

-- CreateIndex
CREATE INDEX "FeeRule_feeProfileId_category_idx" ON "FeeRule"("feeProfileId", "category");

-- CreateIndex
CREATE INDEX "BusinessProfileVersion_effectiveFrom_effectiveTo_idx" ON "BusinessProfileVersion"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfileVersion_name_effectiveFrom_key" ON "BusinessProfileVersion"("name", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ShippingQuote_destinationCountry_quoteDate_idx" ON "ShippingQuote"("destinationCountry", "quoteDate");

-- CreateIndex
CREATE INDEX "CustomsQuote_destinationCountry_hsCode_quoteDate_idx" ON "CustomsQuote"("destinationCountry", "hsCode", "quoteDate");

-- CreateIndex
CREATE INDEX "ExchangeRateSnapshot_capturedAt_idx" ON "ExchangeRateSnapshot"("capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRateSnapshot_baseCurrency_quoteCurrency_capturedAt_key" ON "ExchangeRateSnapshot"("baseCurrency", "quoteCurrency", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_orderDate_idx" ON "Order"("orderDate");

-- CreateIndex
CREATE INDEX "Order_destinationCountry_idx" ON "Order"("destinationCountry");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderCostSnapshot_orderId_calculatedAt_idx" ON "OrderCostSnapshot"("orderId", "calculatedAt");

-- CreateIndex
CREATE INDEX "OrderCostLine_orderCostSnapshotId_category_idx" ON "OrderCostLine"("orderCostSnapshotId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyOverhead_month_key" ON "MonthlyOverhead"("month");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
