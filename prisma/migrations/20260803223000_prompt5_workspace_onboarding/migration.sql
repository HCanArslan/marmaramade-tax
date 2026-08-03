-- Prompt 5 onboarding is additive. Existing workspaces and financial history are untouched.
CREATE TYPE "OnboardingStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'WAITING_FOR_ETSY',
  'WAITING_FOR_SYNC',
  'NEEDS_MINIMUM_COSTS',
  'COMPLETED',
  'SKIPPED'
);

ALTER TABLE "WorkspaceCostDefaultVersion"
  ADD COLUMN "averageLaborHours" DECIMAL(65,30),
  ADD COLUMN "defaultShippingCost" DECIMAL(65,30),
  ADD COLUMN "defaultShippingCurrency" TEXT,
  ADD COLUMN "customsResponsibility" TEXT,
  ADD COLUMN "marketplaceCurrency" TEXT,
  ADD COLUMN "sourceLabel" TEXT,
  ADD COLUMN "monthlyOverheadKnown" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "WorkspaceOnboarding" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "status" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "completedSteps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "skippedOptionalSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "etsyConnectionStatus" TEXT,
  "initialSyncStatus" TEXT,
  "businessProfileVersionId" TEXT,
  "costDefaultVersionId" TEXT,
  "targetMarket" TEXT,
  "reportingCurrency" TEXT,
  "completenessSummary" JSONB,
  "startedAt" TIMESTAMP(3),
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceOnboarding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductCostDefaultApplication" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "costDefaultVersionId" TEXT NOT NULL,
  "laborHours" DECIMAL(65,30),
  "hourlyLaborValue" DECIMAL(65,30),
  "packagingCost" DECIMAL(65,30),
  "materialWastage" DECIMAL(65,30),
  "exportHandlingCost" DECIMAL(65,30),
  "source" TEXT NOT NULL DEFAULT 'ONBOARDING_DEFAULT',
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCostDefaultApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceOnboarding_workspaceId_key" ON "WorkspaceOnboarding"("workspaceId");
CREATE INDEX "WorkspaceOnboarding_status_lastActivityAt_idx" ON "WorkspaceOnboarding"("status", "lastActivityAt");
CREATE UNIQUE INDEX "ProductCostDefaultApplication_productId_key" ON "ProductCostDefaultApplication"("productId");
CREATE INDEX "ProductCostDefaultApplication_workspaceId_costDefaultVersionId_idx" ON "ProductCostDefaultApplication"("workspaceId", "costDefaultVersionId");

ALTER TABLE "WorkspaceOnboarding" ADD CONSTRAINT "WorkspaceOnboarding_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCostDefaultApplication" ADD CONSTRAINT "ProductCostDefaultApplication_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCostDefaultApplication" ADD CONSTRAINT "ProductCostDefaultApplication_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCostDefaultApplication" ADD CONSTRAINT "ProductCostDefaultApplication_costDefaultVersionId_fkey"
  FOREIGN KEY ("costDefaultVersionId") REFERENCES "WorkspaceCostDefaultVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
