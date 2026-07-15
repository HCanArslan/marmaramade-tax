-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "material" TEXT,
    "description" TEXT,
    "hsCode" TEXT,
    "widthCm" DECIMAL(65,30),
    "heightCm" DECIMAL(65,30),
    "handleLengthCm" DECIMAL(65,30),
    "productWeightGrams" DECIMAL(65,30),
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "lining" BOOLEAN NOT NULL DEFAULT false,
    "interiorPocket" BOOLEAN NOT NULL DEFAULT false,
    "closureType" TEXT,
    "baseType" TEXT,
    "oneOfOne" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCostVersion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "materialCostTry" DECIMAL(65,30) NOT NULL,
    "laborHours" DECIMAL(65,30) NOT NULL,
    "laborHourlyRateTry" DECIMAL(65,30) NOT NULL,
    "packagingCostTry" DECIMAL(65,30) NOT NULL,
    "additionalDirectCostTry" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCostVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lengthCm" DECIMAL(65,30) NOT NULL,
    "widthCm" DECIMAL(65,30) NOT NULL,
    "heightCm" DECIMAL(65,30) NOT NULL,
    "actualWeightKg" DECIMAL(65,30) NOT NULL,
    "volumetricDivisor" DECIMAL(65,30) NOT NULL DEFAULT 5000,
    "packagingCostTry" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marketplace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marketplace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeProfile" (
    "id" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "listingCurrency" TEXT NOT NULL,
    "payoutCurrency" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeRule" (
    "id" TEXT NOT NULL,
    "feeProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL,
    "percentageRate" DECIMAL(65,30),
    "fixedAmount" DECIMAL(65,30),
    "fixedCurrency" TEXT,
    "calculationBase" TEXT,
    "vatApplicable" BOOLEAN NOT NULL DEFAULT false,
    "vatRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "minimumAmount" DECIMAL(65,30),
    "maximumAmount" DECIMAL(65,30),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfileVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "businessStatus" TEXT NOT NULL,
    "vatIdSubmittedToEtsy" BOOLEAN NOT NULL,
    "etsyVatTreatment" TEXT NOT NULL,
    "sellerFeeVatRate" DECIMAL(65,30) NOT NULL,
    "accountantMonthlyTry" DECIMAL(65,30) NOT NULL,
    "socialSecurityMonthlyTry" DECIMAL(65,30) NOT NULL,
    "invoicingSoftwareMonthlyTry" DECIMAL(65,30) NOT NULL,
    "bankingMonthlyTry" DECIMAL(65,30) NOT NULL,
    "officeMonthlyTry" DECIMAL(65,30) NOT NULL,
    "otherMonthlyBusinessCostsTry" DECIMAL(65,30) NOT NULL,
    "expectedMonthlyOrders" INTEGER NOT NULL,
    "overheadAllocationMethod" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingQuote" (
    "id" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "destinationRegion" TEXT,
    "carrier" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "incoterm" TEXT NOT NULL,
    "packageLengthCm" DECIMAL(65,30) NOT NULL,
    "packageWidthCm" DECIMAL(65,30) NOT NULL,
    "packageHeightCm" DECIMAL(65,30) NOT NULL,
    "actualWeightKg" DECIMAL(65,30) NOT NULL,
    "volumetricDivisor" DECIMAL(65,30) NOT NULL,
    "volumetricWeightKg" DECIMAL(65,30) NOT NULL,
    "billableWeightKg" DECIMAL(65,30) NOT NULL,
    "shippingCost" DECIMAL(65,30) NOT NULL,
    "shippingCurrency" TEXT NOT NULL,
    "insuranceCost" DECIMAL(65,30) NOT NULL,
    "fuelSurcharge" DECIMAL(65,30) NOT NULL,
    "remoteAreaFee" DECIMAL(65,30) NOT NULL,
    "pickupFee" DECIMAL(65,30) NOT NULL,
    "otherCarrierFees" DECIMAL(65,30) NOT NULL,
    "quoteDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomsQuote" (
    "id" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "hsCode" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL,
    "countryOfOrigin" TEXT NOT NULL,
    "declaredValue" DECIMAL(65,30) NOT NULL,
    "declaredValueCurrency" TEXT NOT NULL,
    "customsDutyRate" DECIMAL(65,30) NOT NULL,
    "customsDutyAmount" DECIMAL(65,30),
    "additionalTariffRate" DECIMAL(65,30) NOT NULL,
    "additionalTariffAmount" DECIMAL(65,30),
    "carrierProcessingFee" DECIMAL(65,30) NOT NULL,
    "brokerageFee" DECIMAL(65,30) NOT NULL,
    "customsClearanceFee" DECIMAL(65,30) NOT NULL,
    "insuranceFee" DECIMAL(65,30) NOT NULL,
    "otherDestinationFee" DECIMAL(65,30) NOT NULL,
    "quoteDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomsQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRateSnapshot" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "source" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "marketplace" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "destinationRegion" TEXT,
    "currency" TEXT NOT NULL,
    "orderStatus" TEXT NOT NULL,
    "offsiteAdAttributed" BOOLEAN NOT NULL DEFAULT false,
    "trailingEtsyRevenueUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currencyConversionRequired" BOOLEAN NOT NULL DEFAULT true,
    "depositFeeApplies" BOOLEAN NOT NULL DEFAULT false,
    "businessProfileVersionId" TEXT NOT NULL,
    "feeProfileId" TEXT NOT NULL,
    "exchangeRateSnapshotId" TEXT NOT NULL,
    "shippingQuoteId" TEXT,
    "customsQuoteId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "unitCurrency" TEXT NOT NULL,
    "sellerFundedDiscount" DECIMAL(65,30) NOT NULL,
    "etsyFundedDiscount" DECIMAL(65,30) NOT NULL,
    "shippingAllocated" DECIMAL(65,30) NOT NULL,
    "giftWrapAllocated" DECIMAL(65,30) NOT NULL,
    "taxCollectedByMarketplace" DECIMAL(65,30) NOT NULL,
    "productCostVersionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderCostSnapshot" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "businessProfileVersionId" TEXT NOT NULL,
    "feeProfileId" TEXT NOT NULL,
    "exchangeRateSnapshotId" TEXT NOT NULL,
    "grossRevenueUsd" DECIMAL(65,30) NOT NULL,
    "totalCostUsd" DECIMAL(65,30) NOT NULL,
    "totalCostTry" DECIMAL(65,30) NOT NULL,
    "estimatedProfitUsd" DECIMAL(65,30) NOT NULL,
    "estimatedProfitTry" DECIMAL(65,30) NOT NULL,
    "assumptionsJson" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderCostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderCostLine" (
    "id" TEXT NOT NULL,
    "orderCostSnapshotId" TEXT NOT NULL,
    "formulaName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "calculationBase" DECIMAL(65,30),
    "rate" DECIMAL(65,30),
    "fixedAmount" DECIMAL(65,30),
    "sourceAmount" DECIMAL(65,30) NOT NULL,
    "sourceCurrency" TEXT NOT NULL,
    "convertedAmountUsd" DECIMAL(65,30) NOT NULL,
    "convertedAmountTry" DECIMAL(65,30) NOT NULL,
    "exchangeRateUsed" DECIMAL(65,30) NOT NULL,
    "applicableProfileName" TEXT,
    "applicableFeeVersion" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderCostLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inputsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioResult" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "grossRevenueUsd" DECIMAL(65,30) NOT NULL,
    "estimatedProfitUsd" DECIMAL(65,30) NOT NULL,
    "estimatedProfitTry" DECIMAL(65,30) NOT NULL,
    "contributionMargin" DECIMAL(65,30) NOT NULL,
    "operatingMargin" DECIMAL(65,30) NOT NULL,
    "afterReserveMargin" DECIMAL(65,30) NOT NULL,
    "calculationSnapshotJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyOverhead" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "accountantTry" DECIMAL(65,30) NOT NULL,
    "socialSecurityTry" DECIMAL(65,30) NOT NULL,
    "softwareTry" DECIMAL(65,30) NOT NULL,
    "bankingTry" DECIMAL(65,30) NOT NULL,
    "officeTry" DECIMAL(65,30) NOT NULL,
    "otherTry" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyOverhead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "actor" TEXT NOT NULL DEFAULT 'local-user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSecurityEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "emailHash" TEXT,
    "ipHash" TEXT,
    "reasonCode" TEXT NOT NULL,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyConnection" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "etsyUserId" TEXT NOT NULL,
    "shopName" TEXT,
    "shopTitle" TEXT,
    "shopCurrency" TEXT,
    "shopUrl" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "lastRefreshedAt" TIMESTAMP(3),
    "lastSuccessfulApiCallAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsyConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyOAuthState" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "verifier" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsySyncRun" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "cursor" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "listingsImported" INTEGER NOT NULL DEFAULT 0,
    "receiptsImported" INTEGER NOT NULL DEFAULT 0,
    "paymentsImported" INTEGER NOT NULL DEFAULT 0,
    "ledgerEntriesImported" INTEGER NOT NULL DEFAULT 0,
    "rateLimitRemaining" INTEGER,
    "retryAfterSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsySyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsySyncError" (
    "id" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "externalId" TEXT,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsySyncError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyListing" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "syncRunId" TEXT,
    "etsyListingId" TEXT NOT NULL,
    "sku" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "state" TEXT NOT NULL,
    "priceAmount" DECIMAL(65,30) NOT NULL,
    "priceCurrency" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "taxonomyId" TEXT,
    "url" TEXT,
    "favorerCount" INTEGER,
    "listingType" TEXT,
    "processingMinDays" INTEGER,
    "processingMaxDays" INTEGER,
    "inventorySummary" JSONB,
    "sourceCreatedAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "sourceEndingAt" TIMESTAMP(3),
    "sourceHash" TEXT NOT NULL,
    "firstImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsyListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyListingImage" (
    "id" TEXT NOT NULL,
    "etsyImageId" TEXT NOT NULL,
    "etsyListingId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "urlFull" TEXT NOT NULL,
    "urlThumbnail" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyListingImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyListingProductLink" (
    "id" TEXT NOT NULL,
    "etsyListingId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuConflict" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsyListingProductLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyReceipt" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "syncRunId" TEXT,
    "etsyReceiptId" TEXT NOT NULL,
    "localOrderId" TEXT,
    "sourceCreatedAt" TIMESTAMP(3) NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "paymentStatus" TEXT,
    "shipmentStatus" TEXT,
    "destinationCountry" TEXT,
    "destinationRegion" TEXT,
    "postalCodePrefix" TEXT,
    "buyerCurrency" TEXT,
    "subtotalAmount" DECIMAL(65,30) NOT NULL,
    "shippingAmount" DECIMAL(65,30) NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL,
    "giftWrapAmount" DECIMAL(65,30) NOT NULL,
    "taxAmount" DECIMAL(65,30) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "refundAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "needsReconciliation" BOOLEAN NOT NULL DEFAULT false,
    "firstImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsyReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyReceiptItem" (
    "id" TEXT NOT NULL,
    "etsyTransactionId" TEXT NOT NULL,
    "etsyReceiptId" TEXT NOT NULL,
    "etsyListingId" TEXT,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "priceAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "sourceCreatedAt" TIMESTAMP(3),
    "firstImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyPayment" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "syncRunId" TEXT,
    "etsyPaymentId" TEXT NOT NULL,
    "etsyReceiptId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "adjustedAmount" DECIMAL(65,30) NOT NULL,
    "shippingAmount" DECIMAL(65,30) NOT NULL,
    "taxAmount" DECIMAL(65,30) NOT NULL,
    "feeAmount" DECIMAL(65,30) NOT NULL,
    "netAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "buyerCurrency" TEXT,
    "paidAt" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "sourceHash" TEXT NOT NULL,
    "firstImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsyPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyLedgerEntry" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "syncRunId" TEXT,
    "etsyLedgerEntryId" TEXT NOT NULL,
    "etsyLedgerId" TEXT,
    "entryType" TEXT NOT NULL,
    "originalDescription" TEXT,
    "mappedCategory" TEXT NOT NULL,
    "mappingConfidence" DECIMAL(65,30) NOT NULL,
    "manualReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT NOT NULL DEFAULT 'UNREVIEWED',
    "amount" DECIMAL(65,30) NOT NULL,
    "runningBalance" DECIMAL(65,30),
    "currency" TEXT NOT NULL,
    "sourceCreatedAt" TIMESTAMP(3) NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "sourceHash" TEXT NOT NULL,
    "firstImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsyLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyWebhookEvent" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "resourceUrl" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "webhookTimestamp" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyImportMapping" (
    "id" TEXT NOT NULL,
    "originalType" TEXT NOT NULL,
    "originalDescription" TEXT,
    "mappedCategory" TEXT NOT NULL,
    "confidence" DECIMAL(65,30) NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "unrelated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsyImportMapping_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "LoginAttempt_emailHash_createdAt_idx" ON "LoginAttempt"("emailHash", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipHash_createdAt_idx" ON "LoginAttempt"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "AdminSecurityEvent_eventType_createdAt_idx" ON "AdminSecurityEvent"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyConnection_shopId_key" ON "EtsyConnection"("shopId");

-- CreateIndex
CREATE INDEX "EtsyConnection_status_idx" ON "EtsyConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyOAuthState_stateHash_key" ON "EtsyOAuthState"("stateHash");

-- CreateIndex
CREATE INDEX "EtsyOAuthState_expiresAt_consumedAt_idx" ON "EtsyOAuthState"("expiresAt", "consumedAt");

-- CreateIndex
CREATE INDEX "EtsySyncRun_connectionId_startedAt_idx" ON "EtsySyncRun"("connectionId", "startedAt");

-- CreateIndex
CREATE INDEX "EtsySyncRun_status_idx" ON "EtsySyncRun"("status");

-- CreateIndex
CREATE INDEX "EtsySyncError_syncRunId_createdAt_idx" ON "EtsySyncError"("syncRunId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyListing_etsyListingId_key" ON "EtsyListing"("etsyListingId");

-- CreateIndex
CREATE INDEX "EtsyListing_connectionId_state_idx" ON "EtsyListing"("connectionId", "state");

-- CreateIndex
CREATE INDEX "EtsyListing_sku_idx" ON "EtsyListing"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyListingImage_etsyImageId_key" ON "EtsyListingImage"("etsyImageId");

-- CreateIndex
CREATE INDEX "EtsyListingImage_etsyListingId_rank_idx" ON "EtsyListingImage"("etsyListingId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyListingProductLink_etsyListingId_key" ON "EtsyListingProductLink"("etsyListingId");

-- CreateIndex
CREATE INDEX "EtsyListingProductLink_productId_idx" ON "EtsyListingProductLink"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyReceipt_etsyReceiptId_key" ON "EtsyReceipt"("etsyReceiptId");

-- CreateIndex
CREATE INDEX "EtsyReceipt_connectionId_sourceCreatedAt_idx" ON "EtsyReceipt"("connectionId", "sourceCreatedAt");

-- CreateIndex
CREATE INDEX "EtsyReceipt_localOrderId_idx" ON "EtsyReceipt"("localOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyReceiptItem_etsyTransactionId_key" ON "EtsyReceiptItem"("etsyTransactionId");

-- CreateIndex
CREATE INDEX "EtsyReceiptItem_etsyReceiptId_idx" ON "EtsyReceiptItem"("etsyReceiptId");

-- CreateIndex
CREATE INDEX "EtsyReceiptItem_etsyListingId_idx" ON "EtsyReceiptItem"("etsyListingId");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyPayment_etsyPaymentId_key" ON "EtsyPayment"("etsyPaymentId");

-- CreateIndex
CREATE INDEX "EtsyPayment_connectionId_paidAt_idx" ON "EtsyPayment"("connectionId", "paidAt");

-- CreateIndex
CREATE INDEX "EtsyPayment_etsyReceiptId_idx" ON "EtsyPayment"("etsyReceiptId");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyLedgerEntry_etsyLedgerEntryId_key" ON "EtsyLedgerEntry"("etsyLedgerEntryId");

-- CreateIndex
CREATE INDEX "EtsyLedgerEntry_connectionId_sourceCreatedAt_idx" ON "EtsyLedgerEntry"("connectionId", "sourceCreatedAt");

-- CreateIndex
CREATE INDEX "EtsyLedgerEntry_mappedCategory_manualReview_idx" ON "EtsyLedgerEntry"("mappedCategory", "manualReview");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyWebhookEvent_webhookId_key" ON "EtsyWebhookEvent"("webhookId");

-- CreateIndex
CREATE INDEX "EtsyWebhookEvent_shopId_createdAt_idx" ON "EtsyWebhookEvent"("shopId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyImportMapping_originalType_originalDescription_key" ON "EtsyImportMapping"("originalType", "originalDescription");

-- AddForeignKey
ALTER TABLE "ProductCostVersion" ADD CONSTRAINT "ProductCostVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeRule" ADD CONSTRAINT "FeeRule_feeProfileId_fkey" FOREIGN KEY ("feeProfileId") REFERENCES "FeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_businessProfileVersionId_fkey" FOREIGN KEY ("businessProfileVersionId") REFERENCES "BusinessProfileVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_feeProfileId_fkey" FOREIGN KEY ("feeProfileId") REFERENCES "FeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_exchangeRateSnapshotId_fkey" FOREIGN KEY ("exchangeRateSnapshotId") REFERENCES "ExchangeRateSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingQuoteId_fkey" FOREIGN KEY ("shippingQuoteId") REFERENCES "ShippingQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customsQuoteId_fkey" FOREIGN KEY ("customsQuoteId") REFERENCES "CustomsQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productCostVersionId_fkey" FOREIGN KEY ("productCostVersionId") REFERENCES "ProductCostVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCostSnapshot" ADD CONSTRAINT "OrderCostSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCostSnapshot" ADD CONSTRAINT "OrderCostSnapshot_businessProfileVersionId_fkey" FOREIGN KEY ("businessProfileVersionId") REFERENCES "BusinessProfileVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCostSnapshot" ADD CONSTRAINT "OrderCostSnapshot_feeProfileId_fkey" FOREIGN KEY ("feeProfileId") REFERENCES "FeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCostSnapshot" ADD CONSTRAINT "OrderCostSnapshot_exchangeRateSnapshotId_fkey" FOREIGN KEY ("exchangeRateSnapshotId") REFERENCES "ExchangeRateSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCostLine" ADD CONSTRAINT "OrderCostLine_orderCostSnapshotId_fkey" FOREIGN KEY ("orderCostSnapshotId") REFERENCES "OrderCostSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioResult" ADD CONSTRAINT "ScenarioResult_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsySyncRun" ADD CONSTRAINT "EtsySyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EtsyConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsySyncError" ADD CONSTRAINT "EtsySyncError_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "EtsySyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListing" ADD CONSTRAINT "EtsyListing_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EtsyConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListing" ADD CONSTRAINT "EtsyListing_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "EtsySyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListingImage" ADD CONSTRAINT "EtsyListingImage_etsyListingId_fkey" FOREIGN KEY ("etsyListingId") REFERENCES "EtsyListing"("etsyListingId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListingProductLink" ADD CONSTRAINT "EtsyListingProductLink_etsyListingId_fkey" FOREIGN KEY ("etsyListingId") REFERENCES "EtsyListing"("etsyListingId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyListingProductLink" ADD CONSTRAINT "EtsyListingProductLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyReceipt" ADD CONSTRAINT "EtsyReceipt_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EtsyConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyReceipt" ADD CONSTRAINT "EtsyReceipt_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "EtsySyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyReceiptItem" ADD CONSTRAINT "EtsyReceiptItem_etsyReceiptId_fkey" FOREIGN KEY ("etsyReceiptId") REFERENCES "EtsyReceipt"("etsyReceiptId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyReceiptItem" ADD CONSTRAINT "EtsyReceiptItem_etsyListingId_fkey" FOREIGN KEY ("etsyListingId") REFERENCES "EtsyListing"("etsyListingId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyPayment" ADD CONSTRAINT "EtsyPayment_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EtsyConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyPayment" ADD CONSTRAINT "EtsyPayment_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "EtsySyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyPayment" ADD CONSTRAINT "EtsyPayment_etsyReceiptId_fkey" FOREIGN KEY ("etsyReceiptId") REFERENCES "EtsyReceipt"("etsyReceiptId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyLedgerEntry" ADD CONSTRAINT "EtsyLedgerEntry_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EtsyConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyLedgerEntry" ADD CONSTRAINT "EtsyLedgerEntry_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "EtsySyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
