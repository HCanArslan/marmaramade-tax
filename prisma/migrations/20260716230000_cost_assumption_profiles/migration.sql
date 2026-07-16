CREATE TYPE "CustomsPayer" AS ENUM ('UNKNOWN', 'SELLER', 'BUYER', 'SHARED');
CREATE TYPE "CustomsIncoterm" AS ENUM ('UNKNOWN', 'DAP', 'DDU', 'DDP', 'OTHER');
CREATE TYPE "EtgbCostStatus" AS ENUM ('UNKNOWN_PENDING_CONFIRMATION', 'INCLUDED_IN_SHIPPING', 'NO_SEPARATE_CHARGE', 'SEPARATE_FIXED_CHARGE', 'SEPARATE_VARIABLE_CHARGE', 'MANUAL');
CREATE TYPE "OverheadAllocationMethod" AS ENUM ('EXPECTED_SALES', 'ACTUAL_SALES', 'NONE', 'MANUAL_PER_ORDER', 'REVENUE_WEIGHTED');

ALTER TABLE "ShippingQuote"
  ADD COLUMN "costCategory" TEXT NOT NULL DEFAULT 'INTERNATIONAL_TRANSPORT',
  ADD COLUMN "estimateStatus" TEXT NOT NULL DEFAULT 'ESTIMATE',
  ADD COLUMN "actualShippingCost" DECIMAL(65,30),
  ADD COLUMN "actualCostCurrency" TEXT,
  ADD COLUMN "reconciledAt" TIMESTAMP(3);

ALTER TABLE "CustomsQuote"
  ADD COLUMN "customsPayer" "CustomsPayer" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "customsIncoterm" "CustomsIncoterm" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "includeInSellerProfit" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "estimateStatus" TEXT NOT NULL DEFAULT 'ESTIMATE_NOT_ACTUAL';

ALTER TABLE "MonthlyOverhead"
  ADD COLUMN "etsyPlusTry" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "allocationMethod" "OverheadAllocationMethod" NOT NULL DEFAULT 'EXPECTED_SALES',
  ADD COLUMN "expectedSales" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "actualSales" INTEGER,
  ADD COLUMN "manualPerOrderTry" DECIMAL(65,30);

CREATE TABLE "CostAssumptionProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "saleValueUsd" DECIMAL(65,30) NOT NULL,
  "productCostUsd" DECIMAL(65,30) NOT NULL,
  "packagingTry" DECIMAL(65,30) NOT NULL,
  "domesticTransferTry" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "internationalShippingUsd" DECIMAL(65,30) NOT NULL,
  "insuranceUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "otherCarrierSurchargeUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "customsEstimateUsd" DECIMAL(65,30) NOT NULL,
  "includeCustomsInSellerProfit" BOOLEAN NOT NULL DEFAULT false,
  "estimatedEtgbFeeUsd" DECIMAL(65,30),
  "includeEtgbInSellerProfit" BOOLEAN NOT NULL DEFAULT false,
  "etsyPlusMonthlyTry" DECIMAL(65,30) NOT NULL DEFAULT 500,
  "companyPackageMonthlyTry" DECIMAL(65,30) NOT NULL DEFAULT 4500,
  "source" TEXT NOT NULL,
  "sourceDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "exchangeRate" DECIMAL(65,30),
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'EDITABLE_STARTER',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CostAssumptionProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomsActualCharge" (
  "id" TEXT NOT NULL,
  "customsQuoteId" TEXT NOT NULL,
  "dutyUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "tariffUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "processingUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "brokerageUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "otherUsd" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalUsd" DECIMAL(65,30) NOT NULL,
  "payer" "CustomsPayer" NOT NULL DEFAULT 'UNKNOWN',
  "source" TEXT NOT NULL,
  "sourceDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "exchangeRate" DECIMAL(65,30),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomsActualCharge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EtgbCostRecord" (
  "id" TEXT NOT NULL,
  "status" "EtgbCostStatus" NOT NULL DEFAULT 'UNKNOWN_PENDING_CONFIRMATION',
  "estimatedFeeUsd" DECIMAL(65,30),
  "actualFeeUsd" DECIMAL(65,30),
  "includedInShipping" BOOLEAN,
  "deductFromProfit" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT NOT NULL,
  "sourceDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "exchangeRate" DECIMAL(65,30),
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EtgbCostRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalCalculatorComparison" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "marketplaceCommissionUsd" DECIMAL(65,30) NOT NULL,
  "paymentCommissionUsd" DECIMAL(65,30) NOT NULL,
  "otherCommissionUsd" DECIMAL(65,30) NOT NULL,
  "source" TEXT NOT NULL,
  "sourceDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "exchangeRate" DECIMAL(65,30),
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'COMPARISON_ONLY',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalCalculatorComparison_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CostAssumptionProfile_name_effectiveFrom_key" ON "CostAssumptionProfile"("name", "effectiveFrom");
CREATE INDEX "CostAssumptionProfile_effectiveFrom_effectiveTo_idx" ON "CostAssumptionProfile"("effectiveFrom", "effectiveTo");
CREATE INDEX "CustomsActualCharge_customsQuoteId_sourceDate_idx" ON "CustomsActualCharge"("customsQuoteId", "sourceDate");
CREATE INDEX "EtgbCostRecord_effectiveFrom_effectiveTo_idx" ON "EtgbCostRecord"("effectiveFrom", "effectiveTo");
CREATE INDEX "ExternalCalculatorComparison_provider_effectiveFrom_idx" ON "ExternalCalculatorComparison"("provider", "effectiveFrom");

ALTER TABLE "CustomsActualCharge" ADD CONSTRAINT "CustomsActualCharge_customsQuoteId_fkey" FOREIGN KEY ("customsQuoteId") REFERENCES "CustomsQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ShippingQuote" (
  "id", "originCountry", "originCity", "destinationCountry", "carrier", "serviceName", "incoterm",
  "packageLengthCm", "packageWidthCm", "packageHeightCm", "actualWeightKg", "volumetricDivisor", "volumetricWeightKg", "billableWeightKg",
  "shippingCost", "shippingCurrency", "insuranceCost", "fuelSurcharge", "remoteAreaFee", "pickupFee", "otherCarrierFees",
  "quoteDate", "source", "notes", "baseShippingPrice", "planningDefault", "activeExpected", "costCategory", "estimateStatus", "createdAt", "updatedAt"
) VALUES (
  'starter_shipentegra_us_149', 'TR', 'Istanbul', 'US', 'ShipEntegra', 'ShipEntegra Express', 'UNKNOWN',
  35, 45, 8, 1, 5000, 2.52, 2.52,
  50.83, 'USD', 0, 0, 0, 0, 0,
  '2026-07-16T00:00:00.000Z', 'ShipEntegra account calculator', 'Editable starter INTERNATIONAL_TRANSPORT quote; customs, ETGB, insurance and Etsy fees excluded unless separately confirmed.', 50.83, true, true, 'INTERNATIONAL_TRANSPORT', 'ESTIMATE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CustomsQuote" (
  "id", "originCountry", "destinationCountry", "hsCode", "productDescription", "countryOfOrigin", "declaredValue", "declaredValueCurrency",
  "customsDutyRate", "customsDutyAmount", "additionalTariffRate", "additionalTariffAmount", "carrierProcessingFee", "brokerageFee", "customsClearanceFee", "insuranceFee", "otherDestinationFee",
  "quoteDate", "source", "notes", "destinationTax", "effectiveFrom", "customsPayer", "customsIncoterm", "includeInSellerProfit", "estimateStatus", "createdAt", "updatedAt"
) VALUES (
  'starter_us_customs_149', 'TR', 'US', '4202224500', 'handbag with outer surface of cotton textile', 'TR', 149, 'USD',
  6.3, 9.39, 10, 14.90, 4.50, 0, 0, 0, 0,
  '2026-07-16T00:00:00.000Z', 'ShipEntegra US customs calculator', 'Editable estimate for quantity 1 and weight 1 kg. Not actual and not deducted until seller-paid inclusion is explicitly enabled.', 0, '2026-07-16T00:00:00.000Z', 'UNKNOWN', 'UNKNOWN', false, 'ESTIMATE_NOT_ACTUAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "MonthlyOverhead" (
  "id", "month", "accountantTry", "socialSecurityTry", "softwareTry", "bankingTry", "officeTry", "otherTry", "etsyPlusTry", "allocationMethod", "expectedSales", "notes", "createdAt", "updatedAt"
) VALUES (
  'starter_overhead_2026_07', '2026-07-01T00:00:00.000Z', 4500, 0, 0, 0, 0, 0, 500, 'EXPECTED_SALES', 10, 'Editable starter: Mükellef/sole-proprietorship package 4,500 TRY (reference 4,000–5,000) plus Etsy Plus 500 TRY. SGK and other costs remain unknown.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("month") DO NOTHING;

INSERT INTO "CostAssumptionProfile" (
  "id", "name", "saleValueUsd", "productCostUsd", "packagingTry", "internationalShippingUsd", "customsEstimateUsd", "source", "sourceDate", "effectiveFrom", "notes", "createdAt", "updatedAt"
) VALUES (
  'starter_marmaramade_us_149', 'MarmaraMade US starter assumptions', 149, 20, 300, 50.83, 28.79, 'Administrator-provided ShipEntegra calculator assumptions', '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z', 'Customs and ETGB are not deducted by default. All values are editable and affect new calculations only.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("name", "effectiveFrom") DO NOTHING;

INSERT INTO "EtgbCostRecord" (
  "id", "status", "includedInShipping", "deductFromProfit", "source", "sourceDate", "effectiveFrom", "notes", "createdAt", "updatedAt"
) VALUES (
  'starter_etgb_unknown', 'UNKNOWN_PENDING_CONFIRMATION', NULL, false, 'Administrator-provided starter assumption', '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z', 'Estimated and actual ETGB fees are unknown. Unknown does not mean zero.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ExternalCalculatorComparison" (
  "id", "provider", "marketplaceCommissionUsd", "paymentCommissionUsd", "otherCommissionUsd", "source", "sourceDate", "effectiveFrom", "notes", "createdAt", "updatedAt"
) VALUES (
  'starter_shipentegra_comparison', 'ShipEntegra profit calculator', 7.264, 11.587, 2.98, 'Administrator-provided screenshot values', '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z', 'Comparison only. Never replaces transparent MarmaraMade Etsy fee rules.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;
