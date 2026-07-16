-- CreateEnum
CREATE TYPE "OperatingMode" AS ENUM ('ARTISAN_TAX_EXEMPTION', 'SOLE_PROPRIETORSHIP', 'LIMITED_COMPANY', 'PLANNING_ONLY');

-- CreateEnum
CREATE TYPE "LegalSellerType" AS ENUM ('TAX_EXEMPT_ARTISAN', 'INDIVIDUAL', 'SOLE_PROPRIETORSHIP', 'COMPANY');

-- CreateEnum
CREATE TYPE "OrphanPensionRiskStatus" AS ENUM ('UNKNOWN', 'UNDER_REVIEW', 'CONFIRMED_NO_IMPACT', 'CONFIRMED_IMPACT', 'MANUAL_REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "ComplianceCaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'WAITING_FOR_RESPONSE', 'RESPONSE_RECEIVED', 'NEEDS_CLARIFICATION', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ComplianceInstitution" AS ENUM ('SGK', 'GIB', 'TAX_OFFICE', 'ETSY', 'SHIPENTEGRA', 'BANK', 'ACCOUNTANT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('ETSY_ORDER', 'ETSY_PAYMENT', 'ETSY_LEDGER', 'PRODUCT_PHOTO', 'PACKAGE_PHOTO', 'SALES_DOCUMENT', 'PROFORMA', 'SHIPENTEGRA_LABEL', 'SHIPENTEGRA_INVOICE', 'ETGB', 'CUSTOMS_CALCULATION', 'DDP_CALCULATION', 'TRACKING_DOCUMENT', 'BANK_PAYOUT', 'BANK_WITHHOLDING', 'MATERIAL_RECEIPT', 'PACKAGING_RECEIPT', 'RETURN_DOCUMENT', 'CUSTOMER_CORRESPONDENCE', 'TAX_EXEMPTION_CERTIFICATE', 'SGK_RESPONSE', 'TAX_OFFICE_RESPONSE', 'ETSY_SUPPORT_RESPONSE', 'SHIPENTEGRA_RESPONSE', 'ACCOUNTANT_OPINION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConfidentialityLevel" AS ENUM ('INTERNAL', 'SENSITIVE', 'HIGHLY_SENSITIVE');

-- CreateEnum
CREATE TYPE "WithholdingBaseType" AS ENUM ('BANK_NET_PAYOUT', 'ETSY_GROSS_REVENUE', 'MANUAL', 'UNKNOWN_PENDING_CONFIRMATION');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProfitMetric" AS ENUM ('MARKETPLACE_CONTRIBUTION', 'PRODUCT_CONTRIBUTION', 'AFTER_LABOR', 'OPERATING_PROFIT', 'REALISTIC_AFTER_TAX_AND_RESERVES');

-- CreateEnum
CREATE TYPE "PlanningMode" AS ENUM ('AVERAGE_PRODUCT', 'PRODUCT_COMBINATION', 'CURRENT_INVENTORY', 'CUSTOM_MIX');

-- AlterTable
ALTER TABLE "ProductCostVersion" ADD COLUMN     "additionalMakerPaymentTry" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "allocatedEquipmentCostTry" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "changeReason" TEXT,
ADD COLUMN     "templateType" TEXT,
ADD COLUMN     "wastageRate" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ShippingQuote" ADD COLUMN     "activeExpected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aggregator" TEXT,
ADD COLUMN     "baseShippingPrice" DECIMAL(65,30),
ADD COLUMN     "packageProfileName" TEXT,
ADD COLUMN     "planningDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transitDaysMax" INTEGER,
ADD COLUMN     "transitDaysMin" INTEGER,
ADD COLUMN     "zone" TEXT;

-- AlterTable
ALTER TABLE "CustomsQuote" ADD COLUMN     "destinationTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "effectiveFrom" TIMESTAMP(3),
ADD COLUMN     "productCategory" TEXT,
ADD COLUMN     "productMaterial" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "complianceComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "etsyReceiptId" TEXT,
ADD COLUMN     "legalOperatingProfileId" TEXT;

-- CreateTable
CREATE TABLE "LegalOperatingProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "operatingMode" "OperatingMode" NOT NULL,
    "legalSellerName" TEXT NOT NULL,
    "legalSellerType" "LegalSellerType" NOT NULL,
    "makerName" TEXT NOT NULL,
    "etsyAccountHolderName" TEXT NOT NULL,
    "etsyTaxpayerName" TEXT NOT NULL,
    "bankAccountHolderName" TEXT NOT NULL,
    "exporterName" TEXT NOT NULL,
    "shipEntegraAccountHolderName" TEXT NOT NULL,
    "businessStatus" TEXT NOT NULL,
    "artisanTaxExemptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "artisanTaxExemptionCertificateNumber" TEXT,
    "artisanTaxExemptionCertificateDate" TIMESTAMP(3),
    "artisanTaxExemptionExpiryDate" TIMESTAMP(3),
    "orphanPensionRiskStatus" "OrphanPensionRiskStatus" NOT NULL DEFAULT 'UNKNOWN',
    "sgkWrittenConfirmationStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "sgkWrittenConfirmationDate" TIMESTAMP(3),
    "vatIdSubmittedToEtsy" BOOLEAN NOT NULL DEFAULT false,
    "sellerFeeVatTreatment" TEXT NOT NULL,
    "incomeTaxReserveRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "withholdingTaxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "expectedMonthlyOrders" INTEGER NOT NULL DEFAULT 1,
    "fourAEmploymentActive" BOOLEAN NOT NULL DEFAULT false,
    "companyStartDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalOperatingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxExemptionLimitVersion" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "annualLimitTry" DECIMAL(65,30) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxExemptionLimitVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceCase" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "institution" "ComplianceInstitution" NOT NULL,
    "topic" TEXT NOT NULL,
    "status" "ComplianceCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "responseDueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "summary" TEXT,
    "decision" TEXT,
    "referenceNumber" TEXT,
    "contactChannel" TEXT,
    "relatedLegalOperatingProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredDocument" (
    "id" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "safeStorageFilename" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "confidentialityLevel" "ConfidentialityLevel" NOT NULL DEFAULT 'SENSITIVE',
    "orderId" TEXT,
    "productId" TEXT,
    "etsyReceiptId" TEXT,
    "shippingQuoteId" TEXT,
    "customsQuoteId" TEXT,
    "legalOperatingProfileId" TEXT,
    "complianceCaseId" TEXT,
    "documentDate" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoredDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequirementRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "destinationCountry" TEXT,
    "operatingMode" "OperatingMode",
    "incoterm" TEXT,
    "carrier" TEXT,
    "returnedOnly" BOOLEAN,
    "artisanExemptionOnly" BOOLEAN,
    "confirmedSnapshotOnly" BOOLEAN,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRequirementRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDocumentChecklist" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "completenessPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "complianceComplete" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDocumentChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDocumentChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "documentId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDocumentChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMaterialCost" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productCostVersionId" TEXT,
    "componentType" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "unitCostTry" DECIMAL(65,30) NOT NULL,
    "totalCostTry" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMaterialCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAdjustment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "amountUsd" DECIMAL(65,30) NOT NULL,
    "amountTry" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceNote" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithholdingRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "legalOperatingProfileId" TEXT,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "expectedWithholdingRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "expectedWithholdingTry" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "actualWithholdingTry" DECIMAL(65,30),
    "withholdingBaseType" "WithholdingBaseType" NOT NULL DEFAULT 'UNKNOWN_PENDING_CONFIRMATION',
    "withholdingBaseTry" DECIMAL(65,30),
    "bankReference" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithholdingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitGoal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetProfitAmount" DECIMAL(65,30) NOT NULL,
    "targetProfitCurrency" TEXT NOT NULL,
    "profitMetric" "ProfitMetric" NOT NULL DEFAULT 'REALISTIC_AFTER_TAX_AND_RESERVES',
    "planningMode" "PlanningMode" NOT NULL,
    "operatingProfileId" TEXT NOT NULL,
    "scenarioSettings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfitGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitGoalVersion" (
    "id" TEXT NOT NULL,
    "profitGoalId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "targetProfitAmount" DECIMAL(65,30) NOT NULL,
    "targetProfitCurrency" TEXT NOT NULL,
    "exchangeRateSnapshotId" TEXT,
    "feeProfileId" TEXT,
    "assumptionsJson" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfitGoalVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalScenario" (
    "id" TEXT NOT NULL,
    "profitGoalId" TEXT NOT NULL,
    "profitGoalVersionId" TEXT,
    "name" TEXT NOT NULL,
    "planningMode" "PlanningMode" NOT NULL,
    "objective" TEXT NOT NULL,
    "settingsJson" JSONB NOT NULL,
    "exactResult" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalScenarioProduct" (
    "id" TEXT NOT NULL,
    "goalScenarioId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "maxQuantity" INTEGER,
    "unitProfitUsd" DECIMAL(65,30) NOT NULL,
    "laborHours" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "GoalScenarioProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalScenarioResult" (
    "id" TEXT NOT NULL,
    "goalScenarioId" TEXT NOT NULL,
    "estimatedProfitUsd" DECIMAL(65,30) NOT NULL,
    "estimatedProfitTry" DECIMAL(65,30) NOT NULL,
    "requiredUnits" INTEGER,
    "requiredRevenueUsd" DECIMAL(65,30) NOT NULL,
    "totalLaborHours" DECIMAL(65,30) NOT NULL,
    "totalFeesUsd" DECIMAL(65,30) NOT NULL,
    "totalLogisticsUsd" DECIMAL(65,30) NOT NULL,
    "totalMaterialsTry" DECIMAL(65,30) NOT NULL,
    "targetAchievementPercent" DECIMAL(65,30) NOT NULL,
    "warningsJson" JSONB NOT NULL,
    "calculationSnapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalScenarioResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyActualSummary" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "confirmedRevenue" DECIMAL(65,30) NOT NULL,
    "confirmedRealisticProfit" DECIMAL(65,30) NOT NULL,
    "openOrderExpectedProfit" DECIMAL(65,30) NOT NULL,
    "actualWithholding" DECIMAL(65,30) NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyActualSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalOperatingProfile_effectiveFrom_effectiveTo_idx" ON "LegalOperatingProfile"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "LegalOperatingProfile_operatingMode_effectiveFrom_idx" ON "LegalOperatingProfile"("operatingMode", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "LegalOperatingProfile_name_effectiveFrom_key" ON "LegalOperatingProfile"("name", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "TaxExemptionLimitVersion_year_effectiveFrom_key" ON "TaxExemptionLimitVersion"("year", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ComplianceCase_status_responseDueAt_idx" ON "ComplianceCase"("status", "responseDueAt");

-- CreateIndex
CREATE INDEX "ComplianceCase_institution_topic_idx" ON "ComplianceCase"("institution", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "StoredDocument_blobPath_key" ON "StoredDocument"("blobPath");

-- CreateIndex
CREATE INDEX "StoredDocument_checksumSha256_deletedAt_idx" ON "StoredDocument"("checksumSha256", "deletedAt");

-- CreateIndex
CREATE INDEX "StoredDocument_orderId_category_status_idx" ON "StoredDocument"("orderId", "category", "status");

-- CreateIndex
CREATE INDEX "StoredDocument_complianceCaseId_idx" ON "StoredDocument"("complianceCaseId");

-- CreateIndex
CREATE INDEX "DocumentRequirementRule_effectiveFrom_effectiveTo_category_idx" ON "DocumentRequirementRule"("effectiveFrom", "effectiveTo", "category");

-- CreateIndex
CREATE UNIQUE INDEX "OrderDocumentChecklist_orderId_key" ON "OrderDocumentChecklist"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderDocumentChecklistItem_checklistId_category_key" ON "OrderDocumentChecklistItem"("checklistId", "category");

-- CreateIndex
CREATE INDEX "ProductMaterialCost_productId_componentType_idx" ON "ProductMaterialCost"("productId", "componentType");

-- CreateIndex
CREATE INDEX "ProductMaterialCost_productCostVersionId_idx" ON "ProductMaterialCost"("productCostVersionId");

-- CreateIndex
CREATE INDEX "OrderAdjustment_orderId_createdAt_idx" ON "OrderAdjustment"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "WithholdingRecord_recordDate_verificationStatus_idx" ON "WithholdingRecord"("recordDate", "verificationStatus");

-- CreateIndex
CREATE INDEX "ProfitGoal_startDate_endDate_idx" ON "ProfitGoal"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitGoalVersion_profitGoalId_versionNumber_key" ON "ProfitGoalVersion"("profitGoalId", "versionNumber");

-- CreateIndex
CREATE INDEX "GoalScenario_profitGoalId_createdAt_idx" ON "GoalScenario"("profitGoalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoalScenarioProduct_goalScenarioId_productId_key" ON "GoalScenarioProduct"("goalScenarioId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalScenarioResult_goalScenarioId_key" ON "GoalScenarioResult"("goalScenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyActualSummary_month_currency_key" ON "MonthlyActualSummary"("month", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "Order_etsyReceiptId_key" ON "Order"("etsyReceiptId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_legalOperatingProfileId_fkey" FOREIGN KEY ("legalOperatingProfileId") REFERENCES "LegalOperatingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCase" ADD CONSTRAINT "ComplianceCase_relatedLegalOperatingProfileId_fkey" FOREIGN KEY ("relatedLegalOperatingProfileId") REFERENCES "LegalOperatingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredDocument" ADD CONSTRAINT "StoredDocument_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredDocument" ADD CONSTRAINT "StoredDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredDocument" ADD CONSTRAINT "StoredDocument_shippingQuoteId_fkey" FOREIGN KEY ("shippingQuoteId") REFERENCES "ShippingQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredDocument" ADD CONSTRAINT "StoredDocument_customsQuoteId_fkey" FOREIGN KEY ("customsQuoteId") REFERENCES "CustomsQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredDocument" ADD CONSTRAINT "StoredDocument_legalOperatingProfileId_fkey" FOREIGN KEY ("legalOperatingProfileId") REFERENCES "LegalOperatingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredDocument" ADD CONSTRAINT "StoredDocument_complianceCaseId_fkey" FOREIGN KEY ("complianceCaseId") REFERENCES "ComplianceCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDocumentChecklist" ADD CONSTRAINT "OrderDocumentChecklist_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDocumentChecklistItem" ADD CONSTRAINT "OrderDocumentChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "OrderDocumentChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDocumentChecklistItem" ADD CONSTRAINT "OrderDocumentChecklistItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "StoredDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaterialCost" ADD CONSTRAINT "ProductMaterialCost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaterialCost" ADD CONSTRAINT "ProductMaterialCost_productCostVersionId_fkey" FOREIGN KEY ("productCostVersionId") REFERENCES "ProductCostVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAdjustment" ADD CONSTRAINT "OrderAdjustment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAdjustment" ADD CONSTRAINT "OrderAdjustment_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "OrderCostSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithholdingRecord" ADD CONSTRAINT "WithholdingRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithholdingRecord" ADD CONSTRAINT "WithholdingRecord_legalOperatingProfileId_fkey" FOREIGN KEY ("legalOperatingProfileId") REFERENCES "LegalOperatingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitGoal" ADD CONSTRAINT "ProfitGoal_operatingProfileId_fkey" FOREIGN KEY ("operatingProfileId") REFERENCES "LegalOperatingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitGoalVersion" ADD CONSTRAINT "ProfitGoalVersion_profitGoalId_fkey" FOREIGN KEY ("profitGoalId") REFERENCES "ProfitGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitGoalVersion" ADD CONSTRAINT "ProfitGoalVersion_exchangeRateSnapshotId_fkey" FOREIGN KEY ("exchangeRateSnapshotId") REFERENCES "ExchangeRateSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitGoalVersion" ADD CONSTRAINT "ProfitGoalVersion_feeProfileId_fkey" FOREIGN KEY ("feeProfileId") REFERENCES "FeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalScenario" ADD CONSTRAINT "GoalScenario_profitGoalId_fkey" FOREIGN KEY ("profitGoalId") REFERENCES "ProfitGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalScenario" ADD CONSTRAINT "GoalScenario_profitGoalVersionId_fkey" FOREIGN KEY ("profitGoalVersionId") REFERENCES "ProfitGoalVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalScenarioProduct" ADD CONSTRAINT "GoalScenarioProduct_goalScenarioId_fkey" FOREIGN KEY ("goalScenarioId") REFERENCES "GoalScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalScenarioProduct" ADD CONSTRAINT "GoalScenarioProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalScenarioResult" ADD CONSTRAINT "GoalScenarioResult_goalScenarioId_fkey" FOREIGN KEY ("goalScenarioId") REFERENCES "GoalScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;


