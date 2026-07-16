-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('SOLE_PROPRIETORSHIP', 'LIMITED_COMPANY', 'JOINT_STOCK_COMPANY', 'TAX_EXEMPT_ARTISAN', 'INDIVIDUAL_PLANNING');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('PLANNING', 'FORMATION_IN_PROGRESS', 'ACTIVE', 'SUSPENDED', 'CLOSING', 'CLOSED');

-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('LEGAL_OWNER', 'BUSINESS_OPERATOR', 'ETSY_ACCOUNT_HOLDER', 'EXPORTER', 'INVOICE_ISSUER', 'BANK_ACCOUNT_HOLDER', 'MAKER', 'DESIGNER', 'PHOTOGRAPHER', 'SHOP_MANAGER', 'PACKAGING_OPERATOR', 'CUSTOMER_SERVICE', 'EMPLOYEE', 'SUPPLIER', 'FAMILY_CONTRIBUTOR', 'ACCOUNTANT', 'OTHER');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', 'PENDING_SGK_CONFIRMATION', 'CONFIRMED_BY_ACCOUNTANT', 'CONFIRMED_BY_SGK', 'CONFIRMED_BY_TAX_OFFICE', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "ShipEntegraEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "ShipEntegraOperationMode" AS ENUM ('PLANNING_ONLY', 'ADMIN_CONFIRMED_SHIPMENT');

-- CreateEnum
CREATE TYPE "ShipEntegraConnectionStatus" AS ENUM ('NOT_CONFIGURED', 'CONNECTED', 'AUTH_FAILED', 'DEGRADED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "ShipEntegraEndpointCategory" AS ENUM ('READ_ONLY', 'QUOTE', 'SHIPMENT_MUTATION', 'TRACKING', 'DOCUMENT', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "ShipEntegraOperationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'NEEDS_RECONCILIATION');

-- CreateEnum
CREATE TYPE "CostSource" AS ENUM ('LOCAL_CUSTOMS_QUOTE', 'SHIPENTEGRA_ESTIMATE', 'SHIPENTEGRA_ACTUAL', 'MANUAL', 'UNKNOWN');

-- AlterEnum
ALTER TYPE "OperatingMode" ADD VALUE 'ARCHIVED';

ALTER TYPE "PlanningMode" ADD VALUE 'SALES_PACE';
ALTER TYPE "PlanningMode" ADD VALUE 'CASH_FLOW_TARGET';

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "operatingMode" "OperatingMode" NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
    "status" "BusinessStatus" NOT NULL DEFAULT 'FORMATION_IN_PROGRESS',
    "ownerFullName" TEXT NOT NULL,
    "ownerNationalIdMasked" TEXT,
    "taxNumberMasked" TEXT,
    "taxOffice" TEXT,
    "naceCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "establishmentDate" TIMESTAMP(3),
    "closureDate" TIMESTAMP(3),
    "tradeAddress" TEXT,
    "correspondenceAddress" TEXT,
    "homeOffice" BOOLEAN NOT NULL DEFAULT false,
    "virtualOfficeProvider" TEXT,
    "virtualOfficeContractStart" TIMESTAMP(3),
    "virtualOfficeContractEnd" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "accountantName" TEXT,
    "accountantCompany" TEXT,
    "accountantEmail" TEXT,
    "accountantPhone" TEXT,
    "accountingContractStart" TIMESTAMP(3),
    "accountingContractEnd" TIMESTAMP(3),
    "accountantConfirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING_ACCOUNTANT_CONFIRMATION',
    "customsRegistrationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "customsRegistrationDate" TIMESTAMP(3),
    "etgbEnabled" BOOLEAN NOT NULL DEFAULT false,
    "microExportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "eArchiveEnabled" BOOLEAN,
    "eInvoiceEnabled" BOOLEAN,
    "eDispatchEnabled" BOOLEAN,
    "eSignatureEnabled" BOOLEAN,
    "financialSealEnabled" BOOLEAN,
    "etsyLegalSellerName" TEXT NOT NULL,
    "etsyTaxpayerName" TEXT NOT NULL,
    "etsyPaymentsHolderName" TEXT NOT NULL,
    "shipEntegraAccountHolderName" TEXT NOT NULL,
    "exporterName" TEXT NOT NULL,
    "invoiceIssuerName" TEXT NOT NULL,
    "bankAccountHolderName" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPerson" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "displayName" TEXT,
    "relationshipToOwner" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPersonRole" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "PersonRole" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "compensationModel" TEXT,
    "sgkStatus" "ConfirmationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "taxTreatmentStatus" "ConfirmationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "accountantConfirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING_ACCOUNTANT_CONFIRMATION',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPersonRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormationTask" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "responsibleParty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "confirmationSource" "ConfirmationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "relatedDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "ibanMasked" TEXT,
    "accountNumberMasked" TEXT,
    "currency" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "businessDedicated" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCard" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "cardholderName" TEXT NOT NULL,
    "lastFourDigits" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "businessDedicated" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "statementClosingDay" INTEGER,
    "paymentDueDay" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalReference" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "valueDate" TIMESTAMP(3),
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "normalizedDescription" TEXT,
    "counterparty" TEXT,
    "category" TEXT,
    "reconciliationStatus" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "relatedOrderId" TEXT,
    "relatedExpenseId" TEXT,
    "relatedTaxPaymentId" TEXT,
    "relatedEtsyPayoutId" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransactionMatch" (
    "id" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "confidence" DECIMAL(65,30),
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransactionMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerTransaction" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "bankTransactionId" TEXT,
    "description" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "supplierName" TEXT,
    "supplierTaxNumberMasked" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "netAmount" DECIMAL(65,30) NOT NULL,
    "vatAmount" DECIMAL(65,30) NOT NULL,
    "grossAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(65,30),
    "grossAmountTry" DECIMAL(65,30) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymentMethodId" TEXT,
    "bankTransactionId" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "documentDate" TIMESTAMP(3),
    "documentId" TEXT,
    "deductibilityStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "deductiblePercentage" DECIMAL(65,30),
    "vatDeductibilityStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "vatDeductiblePercentage" DECIMAL(65,30),
    "allocationMethod" TEXT,
    "allocatedProductId" TEXT,
    "allocatedOrderId" TEXT,
    "allocatedPeriod" TIMESTAMP(3),
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "accountantReviewStatus" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING_ACCOUNTANT_CONFIRMATION',
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "expectedAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "recurrenceRule" TEXT NOT NULL,
    "nextDueAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deductibilityStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAllocation" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "percentage" DECIMAL(65,30) NOT NULL,
    "amountTry" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "acquisitionCost" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "acquisitionCostTry" DECIMAL(65,30) NOT NULL,
    "usefulLifeMonths" INTEGER,
    "depreciationMethod" TEXT,
    "depreciationStartDate" TIMESTAMP(3),
    "accumulatedDepreciation" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "carryingValue" DECIMAL(65,30) NOT NULL,
    "disposalDate" TIMESTAMP(3),
    "documentId" TEXT,
    "accountantReviewStatus" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING_ACCOUNTANT_CONFIRMATION',
    "planningDepreciationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reorderPoint" DECIMAL(65,30),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPurchaseLot" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "remaining" DECIMAL(65,30) NOT NULL,
    "unitCostTry" DECIMAL(65,30) NOT NULL,
    "documentId" TEXT,
    "supplierName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialPurchaseLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialInventoryTransaction" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "transactionAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialInventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "productTemplateId" TEXT NOT NULL,
    "makerPersonId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "plannedQuantity" INTEGER NOT NULL,
    "completedQuantity" INTEGER NOT NULL DEFAULT 0,
    "rejectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "totalLaborHours" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "materialCostVersionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionUnit" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "localSku" TEXT NOT NULL,
    "serialNumber" TEXT,
    "oneOfOne" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3),
    "qualityStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "productCostSnapshot" JSONB NOT NULL,
    "inventoryStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "etsyListingId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishedInventoryTransaction" (
    "id" TEXT NOT NULL,
    "productionUnitId" TEXT NOT NULL,
    "transactionAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "orderId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinishedInventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyPayout" (
    "id" TEXT NOT NULL,
    "etsyPayoutId" TEXT NOT NULL,
    "payoutDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "bankReference" TEXT,
    "sourceHash" TEXT NOT NULL,
    "firstImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtsyPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtsyPayoutReconciliation" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "fxDifferenceTry" DECIMAL(65,30),
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtsyPayoutReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesDocument" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL,
    "netAmount" DECIMAL(65,30) NOT NULL,
    "vatAmount" DECIMAL(65,30) NOT NULL,
    "grossAmount" DECIMAL(65,30) NOT NULL,
    "validationJson" JSONB NOT NULL,
    "externalProvider" TEXT,
    "externalReference" TEXT,
    "storedDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipEntegraConnection" (
    "id" TEXT NOT NULL,
    "status" "ShipEntegraConnectionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "accountReference" TEXT,
    "environment" "ShipEntegraEnvironment" NOT NULL,
    "operationMode" "ShipEntegraOperationMode" NOT NULL DEFAULT 'PLANNING_ONLY',
    "connectedAt" TIMESTAMP(3),
    "lastSuccessfulRequestAt" TIMESTAMP(3),
    "lastFailedRequestAt" TIMESTAMP(3),
    "lastQuoteSyncAt" TIMESTAMP(3),
    "lastShipmentSyncAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipEntegraConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipEntegraQuote" (
    "id" TEXT NOT NULL,
    "localOrderId" TEXT,
    "packageProfileId" TEXT,
    "originCountry" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "destinationPostalCodePartial" TEXT,
    "weightBand" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "incoterm" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "estimatedPrice" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "fuelCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "additionalFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "additionalFeeDescription" TEXT,
    "estimatedDeliveryMinDays" INTEGER,
    "estimatedDeliveryMaxDays" INTEGER,
    "quotePayloadHash" TEXT NOT NULL,
    "requestAssumptionsJson" JSONB NOT NULL,
    "quotedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "source" "CostSource" NOT NULL DEFAULT 'SHIPENTEGRA_ESTIMATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipEntegraQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipEntegraConfirmation" (
    "id" TEXT NOT NULL,
    "localOrderId" TEXT NOT NULL,
    "legalOperatingProfileId" TEXT NOT NULL,
    "selectedQuoteId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "previewPayloadHash" TEXT NOT NULL,
    "confirmedBy" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipEntegraConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipEntegraShipmentOperation" (
    "id" TEXT NOT NULL,
    "localOrderId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "externalReference" TEXT NOT NULL,
    "confirmationId" TEXT NOT NULL,
    "status" "ShipEntegraOperationStatus" NOT NULL DEFAULT 'PENDING',
    "requestPayloadHash" TEXT NOT NULL,
    "externalShipmentId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipEntegraShipmentOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipEntegraShipment" (
    "id" TEXT NOT NULL,
    "localOrderId" TEXT NOT NULL,
    "externalShipmentId" TEXT NOT NULL,
    "externalOrderReference" TEXT NOT NULL,
    "carrier" TEXT,
    "serviceCode" TEXT,
    "serviceName" TEXT,
    "incoterm" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "shipmentStatus" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "estimatedCost" DECIMAL(65,30),
    "creationCost" DECIMAL(65,30),
    "actualCost" DECIMAL(65,30),
    "currency" TEXT,
    "labelDocumentId" TEXT,
    "createdRemotelyAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipEntegraShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipEntegraTrackingEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "statusCode" TEXT,
    "statusLabel" TEXT,
    "description" TEXT NOT NULL,
    "eventLocation" TEXT,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "firstImportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipEntegraTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipEntegraShipmentSnapshot" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "packageProfileId" TEXT,
    "snapshotType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "carrier" TEXT,
    "service" TEXT,
    "incoterm" TEXT NOT NULL,
    "packageLengthCm" DECIMAL(65,30) NOT NULL,
    "packageWidthCm" DECIMAL(65,30) NOT NULL,
    "packageHeightCm" DECIMAL(65,30) NOT NULL,
    "actualWeightKg" DECIMAL(65,30) NOT NULL,
    "declaredValue" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "estimatedCost" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipEntegraShipmentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipEntegraApiCall" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "endpointCategory" "ShipEntegraEndpointCategory" NOT NULL,
    "success" BOOLEAN NOT NULL,
    "statusCode" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "requestReference" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipEntegraApiCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingCostAdjustment" (
    "id" TEXT NOT NULL,
    "localOrderId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "source" "CostSource" NOT NULL,
    "estimatedAmount" DECIMAL(65,30),
    "actualAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "varianceAmount" DECIMAL(65,30),
    "variancePercentage" DECIMAL(65,30),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingCostAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomsProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "incoterm" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomsProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffVersion" (
    "id" TEXT NOT NULL,
    "hsCode" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL,
    "material" TEXT,
    "originCountry" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "dutyRate" DECIMAL(65,30),
    "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TariffVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroExportCase" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "exporterName" TEXT NOT NULL,
    "customsStatus" TEXT,
    "etgbStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "shipmentId" TEXT,
    "invoiceDocumentId" TEXT,
    "proformaDocumentId" TEXT,
    "etgbDocumentId" TEXT,
    "customsDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicroExportCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRuleVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "rate" DECIMAL(65,30),
    "threshold" DECIMAL(65,30),
    "currency" TEXT,
    "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxObligation" (
    "id" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "estimatedAmount" DECIMAL(65,30),
    "filedAmount" DECIMAL(65,30),
    "paidAmount" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "filingDocumentId" TEXT,
    "paymentDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VatPeriod" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "outputVat" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "inputVat" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "estimatedPayable" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "filedPayable" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VatPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeTaxEstimate" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "taxableBusinessBase" DECIMAL(65,30) NOT NULL,
    "salaryIncomeIncluded" BOOLEAN NOT NULL DEFAULT false,
    "estimatedTax" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "assumptionsJson" JSONB NOT NULL,
    "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomeTaxEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SgkMonthStatus" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "fourAActive" BOOLEAN,
    "fourBStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "debtAmount" DECIMAL(65,30),
    "paymentAmount" DECIMAL(65,30),
    "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SgkMonthStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountantPeriod" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "expectedDocuments" INTEGER NOT NULL DEFAULT 0,
    "uploadedDocuments" INTEGER NOT NULL DEFAULT 0,
    "missingDocuments" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "confirmedReceivedAt" TIMESTAMP(3),
    "accountantNotes" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountantPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessProfile_active_effectiveFrom_effectiveTo_idx" ON "BusinessProfile"("active", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "BusinessProfile_operatingMode_effectiveFrom_idx" ON "BusinessProfile"("operatingMode", "effectiveFrom");

-- CreateIndex
CREATE INDEX "BusinessPerson_active_fullName_idx" ON "BusinessPerson"("active", "fullName");

-- CreateIndex
CREATE INDEX "BusinessPersonRole_role_effectiveFrom_effectiveTo_idx" ON "BusinessPersonRole"("role", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPersonRole_personId_role_effectiveFrom_key" ON "BusinessPersonRole"("personId", "role", "effectiveFrom");

-- CreateIndex
CREATE INDEX "FormationTask_status_dueDate_idx" ON "FormationTask"("status", "dueDate");

-- CreateIndex
CREATE INDEX "FormationTask_category_idx" ON "FormationTask"("category");

-- CreateIndex
CREATE INDEX "BankAccount_businessProfileId_active_idx" ON "BankAccount"("businessProfileId", "active");

-- CreateIndex
CREATE INDEX "BankAccount_currency_idx" ON "BankAccount"("currency");

-- CreateIndex
CREATE INDEX "PaymentCard_businessProfileId_active_idx" ON "PaymentCard"("businessProfileId", "active");

-- CreateIndex
CREATE INDEX "BankTransaction_transactionDate_reconciliationStatus_idx" ON "BankTransaction"("transactionDate", "reconciliationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_accountId_externalReference_key" ON "BankTransaction"("accountId", "externalReference");

-- CreateIndex
CREATE INDEX "BankTransactionMatch_targetType_targetId_idx" ON "BankTransactionMatch"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransactionMatch_bankTransactionId_targetType_targetId_key" ON "BankTransactionMatch"("bankTransactionId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "OwnerTransaction_businessProfileId_transactionDate_idx" ON "OwnerTransaction"("businessProfileId", "transactionDate");

-- CreateIndex
CREATE INDEX "Expense_expenseDate_category_idx" ON "Expense"("expenseDate", "category");

-- CreateIndex
CREATE INDEX "Expense_paymentStatus_deletedAt_idx" ON "Expense"("paymentStatus", "deletedAt");

-- CreateIndex
CREATE INDEX "RecurringExpense_active_nextDueAt_idx" ON "RecurringExpense"("active", "nextDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAllocation_expenseId_targetType_targetId_key" ON "ExpenseAllocation"("expenseId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "FixedAsset_businessProfileId_acquisitionDate_idx" ON "FixedAsset"("businessProfileId", "acquisitionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Material_sku_key" ON "Material"("sku");

-- CreateIndex
CREATE INDEX "MaterialPurchaseLot_materialId_purchasedAt_idx" ON "MaterialPurchaseLot"("materialId", "purchasedAt");

-- CreateIndex
CREATE INDEX "MaterialInventoryTransaction_materialId_transactionAt_idx" ON "MaterialInventoryTransaction"("materialId", "transactionAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_batchCode_key" ON "ProductionBatch"("batchCode");

-- CreateIndex
CREATE INDEX "ProductionBatch_status_startDate_idx" ON "ProductionBatch"("status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionUnit_localSku_key" ON "ProductionUnit"("localSku");

-- CreateIndex
CREATE INDEX "ProductionUnit_inventoryStatus_completedAt_idx" ON "ProductionUnit"("inventoryStatus", "completedAt");

-- CreateIndex
CREATE INDEX "FinishedInventoryTransaction_productionUnitId_transactionAt_idx" ON "FinishedInventoryTransaction"("productionUnitId", "transactionAt");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyPayout_etsyPayoutId_key" ON "EtsyPayout"("etsyPayoutId");

-- CreateIndex
CREATE INDEX "EtsyPayout_payoutDate_status_idx" ON "EtsyPayout"("payoutDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EtsyPayoutReconciliation_payoutId_targetType_targetId_key" ON "EtsyPayoutReconciliation"("payoutId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "SalesDocument_orderId_status_idx" ON "SalesDocument"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SalesDocument_documentType_documentNumber_key" ON "SalesDocument"("documentType", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ShipEntegraConnection_environment_key" ON "ShipEntegraConnection"("environment");

-- CreateIndex
CREATE INDEX "ShipEntegraQuote_destinationCountry_packageProfileId_weight_idx" ON "ShipEntegraQuote"("destinationCountry", "packageProfileId", "weightBand", "quotedAt");

-- CreateIndex
CREATE INDEX "ShipEntegraQuote_localOrderId_selected_idx" ON "ShipEntegraQuote"("localOrderId", "selected");

-- CreateIndex
CREATE UNIQUE INDEX "ShipEntegraQuote_quotePayloadHash_serviceCode_key" ON "ShipEntegraQuote"("quotePayloadHash", "serviceCode");

-- CreateIndex
CREATE UNIQUE INDEX "ShipEntegraConfirmation_tokenHash_key" ON "ShipEntegraConfirmation"("tokenHash");

-- CreateIndex
CREATE INDEX "ShipEntegraConfirmation_localOrderId_expiresAt_consumedAt_idx" ON "ShipEntegraConfirmation"("localOrderId", "expiresAt", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShipEntegraShipmentOperation_idempotencyKey_key" ON "ShipEntegraShipmentOperation"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ShipEntegraShipmentOperation_externalReference_key" ON "ShipEntegraShipmentOperation"("externalReference");

-- CreateIndex
CREATE INDEX "ShipEntegraShipmentOperation_localOrderId_status_idx" ON "ShipEntegraShipmentOperation"("localOrderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShipEntegraShipment_localOrderId_key" ON "ShipEntegraShipment"("localOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipEntegraShipment_externalShipmentId_key" ON "ShipEntegraShipment"("externalShipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipEntegraShipment_externalOrderReference_key" ON "ShipEntegraShipment"("externalOrderReference");

-- CreateIndex
CREATE INDEX "ShipEntegraShipment_shipmentStatus_lastSyncedAt_idx" ON "ShipEntegraShipment"("shipmentStatus", "lastSyncedAt");

-- CreateIndex
CREATE INDEX "ShipEntegraShipment_trackingNumber_idx" ON "ShipEntegraShipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "ShipEntegraTrackingEvent_shipmentId_eventTime_idx" ON "ShipEntegraTrackingEvent"("shipmentId", "eventTime");

-- CreateIndex
CREATE UNIQUE INDEX "ShipEntegraTrackingEvent_shipmentId_externalEventId_key" ON "ShipEntegraTrackingEvent"("shipmentId", "externalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipEntegraShipmentSnapshot_shipmentId_snapshotType_payload_key" ON "ShipEntegraShipmentSnapshot"("shipmentId", "snapshotType", "payloadHash");

-- CreateIndex
CREATE INDEX "ShipEntegraApiCall_operation_createdAt_idx" ON "ShipEntegraApiCall"("operation", "createdAt");

-- CreateIndex
CREATE INDEX "ShipEntegraApiCall_success_createdAt_idx" ON "ShipEntegraApiCall"("success", "createdAt");

-- CreateIndex
CREATE INDEX "ShippingCostAdjustment_localOrderId_createdAt_idx" ON "ShippingCostAdjustment"("localOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomsProfile_originCountry_destinationCountry_effectiveFr_idx" ON "CustomsProfile"("originCountry", "destinationCountry", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "TariffVersion_hsCode_originCountry_destinationCountry_effec_key" ON "TariffVersion"("hsCode", "originCountry", "destinationCountry", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "MicroExportCase_orderId_key" ON "MicroExportCase"("orderId");

-- CreateIndex
CREATE INDEX "MicroExportCase_status_etgbStatus_idx" ON "MicroExportCase"("status", "etgbStatus");

-- CreateIndex
CREATE INDEX "TaxRuleVersion_taxType_effectiveFrom_effectiveTo_idx" ON "TaxRuleVersion"("taxType", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "TaxObligation_status_dueDate_idx" ON "TaxObligation"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "VatPeriod_year_month_key" ON "VatPeriod"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeTaxEstimate_year_period_key" ON "IncomeTaxEstimate"("year", "period");

-- CreateIndex
CREATE UNIQUE INDEX "SgkMonthStatus_year_month_key" ON "SgkMonthStatus"("year", "month");

-- CreateIndex
CREATE INDEX "AccountantPeriod_status_year_month_idx" ON "AccountantPeriod"("status", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "AccountantPeriod_year_month_key" ON "AccountantPeriod"("year", "month");

-- AddForeignKey
ALTER TABLE "BusinessPersonRole" ADD CONSTRAINT "BusinessPersonRole_personId_fkey" FOREIGN KEY ("personId") REFERENCES "BusinessPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransactionMatch" ADD CONSTRAINT "BankTransactionMatch_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocation" ADD CONSTRAINT "ExpenseAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPurchaseLot" ADD CONSTRAINT "MaterialPurchaseLot_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialInventoryTransaction" ADD CONSTRAINT "MaterialInventoryTransaction_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUnit" ADD CONSTRAINT "ProductionUnit_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProductionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedInventoryTransaction" ADD CONSTRAINT "FinishedInventoryTransaction_productionUnitId_fkey" FOREIGN KEY ("productionUnitId") REFERENCES "ProductionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtsyPayoutReconciliation" ADD CONSTRAINT "EtsyPayoutReconciliation_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "EtsyPayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipEntegraQuote" ADD CONSTRAINT "ShipEntegraQuote_localOrderId_fkey" FOREIGN KEY ("localOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipEntegraQuote" ADD CONSTRAINT "ShipEntegraQuote_packageProfileId_fkey" FOREIGN KEY ("packageProfileId") REFERENCES "PackageProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipEntegraConfirmation" ADD CONSTRAINT "ShipEntegraConfirmation_localOrderId_fkey" FOREIGN KEY ("localOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipEntegraConfirmation" ADD CONSTRAINT "ShipEntegraConfirmation_legalOperatingProfileId_fkey" FOREIGN KEY ("legalOperatingProfileId") REFERENCES "LegalOperatingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipEntegraShipment" ADD CONSTRAINT "ShipEntegraShipment_localOrderId_fkey" FOREIGN KEY ("localOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipEntegraShipment" ADD CONSTRAINT "ShipEntegraShipment_labelDocumentId_fkey" FOREIGN KEY ("labelDocumentId") REFERENCES "StoredDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipEntegraTrackingEvent" ADD CONSTRAINT "ShipEntegraTrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "ShipEntegraShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipEntegraShipmentSnapshot" ADD CONSTRAINT "ShipEntegraShipmentSnapshot_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "ShipEntegraShipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipEntegraShipmentSnapshot" ADD CONSTRAINT "ShipEntegraShipmentSnapshot_packageProfileId_fkey" FOREIGN KEY ("packageProfileId") REFERENCES "PackageProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingCostAdjustment" ADD CONSTRAINT "ShippingCostAdjustment_localOrderId_fkey" FOREIGN KEY ("localOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Safe initial operating-profile backfill. These rows add the confirmed current
-- structure; no historical profile, order, OAuth token, or snapshot is updated.
INSERT INTO "BusinessProfile" (
  "id", "displayName", "legalName", "brandName", "businessType", "operatingMode", "status",
  "ownerFullName", "etsyLegalSellerName", "etsyTaxpayerName", "etsyPaymentsHolderName",
  "shipEntegraAccountHolderName", "exporterName", "invoiceIssuerName", "bankAccountHolderName",
  "effectiveFrom", "active", "createdAt", "updatedAt"
) VALUES (
  'business_marmaramade_sole_prop_2026', 'MarmaraMade', 'Hamit Can Arslan Sole Proprietorship', 'MarmaraMade',
  'SOLE_PROPRIETORSHIP', 'SOLE_PROPRIETORSHIP', 'FORMATION_IN_PROGRESS', 'Hamit Can Arslan',
  'Hamit Can Arslan', 'Hamit Can Arslan', 'Hamit Can Arslan', 'Hamit Can Arslan', 'Hamit Can Arslan',
  'Hamit Can Arslan Sole Proprietorship', 'Hamit Can Arslan', TIMESTAMP '2026-07-16 00:00:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "BusinessPerson" ("id", "fullName", "displayName", "relationshipToOwner", "active", "createdAt", "updatedAt") VALUES
  ('person_hamit_can_arslan', 'Hamit Can Arslan', 'Hamit', 'SELF', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('person_selda_marmaramade', 'Selda', 'Selda', 'FAMILY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "BusinessPersonRole" (
  "id", "personId", "role", "effectiveFrom", "sgkStatus", "taxTreatmentStatus", "accountantConfirmationStatus", "notes", "createdAt", "updatedAt"
) VALUES
  ('role_hamit_owner', 'person_hamit_can_arslan', 'LEGAL_OWNER', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_hamit_operator', 'person_hamit_can_arslan', 'BUSINESS_OPERATOR', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_hamit_etsy', 'person_hamit_can_arslan', 'ETSY_ACCOUNT_HOLDER', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_hamit_exporter', 'person_hamit_can_arslan', 'EXPORTER', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_hamit_invoice', 'person_hamit_can_arslan', 'INVOICE_ISSUER', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_hamit_bank', 'person_hamit_can_arslan', 'BANK_ACCOUNT_HOLDER', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_hamit_manager', 'person_hamit_can_arslan', 'SHOP_MANAGER', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_hamit_photo', 'person_hamit_can_arslan', 'PHOTOGRAPHER', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_hamit_packaging', 'person_hamit_can_arslan', 'PACKAGING_OPERATOR', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_hamit_customer', 'person_hamit_can_arslan', 'CUSTOMER_SERVICE', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_selda_maker', 'person_selda_marmaramade', 'MAKER', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', 'Operational role only; employment, SGK, tax, and compensation treatment remain unconfirmed.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_selda_designer', 'person_selda_marmaramade', 'DESIGNER', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', 'Operational role only.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_selda_family', 'person_selda_marmaramade', 'FAMILY_CONTRIBUTOR', TIMESTAMP '2026-07-16', 'UNKNOWN', 'UNKNOWN', 'PENDING_ACCOUNTANT_CONFIRMATION', 'Not automatically classified as employee or supplier.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "LegalOperatingProfile" (
  "id", "name", "effectiveFrom", "operatingMode", "legalSellerName", "legalSellerType", "makerName",
  "etsyAccountHolderName", "etsyTaxpayerName", "bankAccountHolderName", "exporterName", "shipEntegraAccountHolderName",
  "businessStatus", "sellerFeeVatTreatment", "createdAt", "updatedAt"
) VALUES (
  'legal_profile_hamit_sole_prop_2026', 'Hamit Can Arslan — Sole Proprietorship', TIMESTAMP '2026-07-16',
  'SOLE_PROPRIETORSHIP', 'Hamit Can Arslan Sole Proprietorship', 'SOLE_PROPRIETORSHIP', 'Selda',
  'Hamit Can Arslan', 'Hamit Can Arslan', 'Hamit Can Arslan', 'Hamit Can Arslan', 'Hamit Can Arslan',
  'FORMATION_IN_PROGRESS', 'PENDING_ACCOUNTANT_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

INSERT INTO "FormationTask" ("id", "category", "title", "status", "confirmationSource", "createdAt", "updatedAt") VALUES
  ('formation_accountant', 'ACCOUNTANT', 'Select accountant or digital accounting provider', 'NOT_STARTED', 'PENDING_ACCOUNTANT_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_trade_name', 'TAX_OFFICE', 'Confirm trade name and NACE codes', 'NOT_STARTED', 'PENDING_ACCOUNTANT_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_address', 'ADDRESS', 'Confirm business address', 'NOT_STARTED', 'PENDING_ACCOUNTANT_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_establishment', 'TAX_OFFICE', 'Complete sole-proprietorship establishment', 'NOT_STARTED', 'PENDING_ACCOUNTANT_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_tax_certificate', 'TAX_OFFICE', 'Obtain tax certificate and record tax office', 'NOT_STARTED', 'PENDING_ACCOUNTANT_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_earchive', 'E_DOCUMENT', 'Activate e-Archive and confirm other e-document requirements', 'NOT_STARTED', 'PENDING_ACCOUNTANT_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_bank_try', 'BANK', 'Open dedicated business TRY account', 'NOT_STARTED', 'UNKNOWN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_bank_usd', 'BANK', 'Open dedicated business USD account', 'NOT_STARTED', 'UNKNOWN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_etsy', 'ETSY', 'Update Etsy legal, tax, payment, and bank identity', 'NOT_STARTED', 'PENDING_ACCOUNTANT_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_shipentegra', 'SHIPENTEGRA', 'Open or update ShipEntegra business account', 'NOT_STARTED', 'UNKNOWN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_customs', 'CUSTOMS', 'Complete customs taxpayer registration', 'NOT_STARTED', 'UNKNOWN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_etgb', 'ETGB', 'Confirm ETGB eligibility and document workflow', 'NOT_STARTED', 'UNKNOWN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_sgk', 'SGK', 'Confirm 4/a, 4/b, and family-maker status', 'NOT_STARTED', 'PENDING_SGK_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_documents', 'PRIVACY', 'Configure document retention and KVKK/privacy duties', 'NOT_STARTED', 'PENDING_ACCOUNTANT_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formation_handoff', 'ACCOUNTANT', 'Configure monthly accountant document handoff', 'NOT_STARTED', 'PENDING_ACCOUNTANT_CONFIRMATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
