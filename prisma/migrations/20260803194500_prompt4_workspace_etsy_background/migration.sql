-- Prompt 4: workspace-owned Etsy OAuth, synchronization, and delivery state.
-- This migration preserves every token ciphertext and imported business row.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "EtsyConnection" c
    LEFT JOIN "Shop" s ON s."id" = c."saasShopId"
    WHERE c."workspaceId" IS NULL
       OR c."saasShopId" IS NULL
       OR s."id" IS NULL
       OR s."workspaceId" <> c."workspaceId"
       OR s."platform" <> 'ETSY'::"ShopPlatform"
       OR s."externalShopId" IS DISTINCT FROM c."shopId"
  ) THEN
    RAISE EXCEPTION 'Prompt 4 requires every Etsy connection to resolve to exactly one matching workspace Etsy shop.';
  END IF;

  IF EXISTS (
    SELECT "externalShopId"
    FROM "Shop"
    WHERE "externalShopId" IS NOT NULL
    GROUP BY "platform", "externalShopId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Prompt 4 found an Etsy external shop assigned to more than one workspace.';
  END IF;

  IF EXISTS (
    SELECT "webhookId"
    FROM "EtsyWebhookEvent"
    GROUP BY "webhookId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Prompt 4 found duplicate Etsy webhook delivery IDs.';
  END IF;
END $$;

CREATE TYPE "EtsyConnectionStatus" AS ENUM (
  'PENDING', 'ACTIVE', 'TOKEN_EXPIRED', 'REAUTH_REQUIRED',
  'SCOPE_VIOLATION', 'DISCONNECTED', 'ERROR'
);

CREATE TYPE "EtsySyncRunStatus" AS ENUM (
  'QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELLED'
);

ALTER TABLE "EtsyConnection" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "EtsyConnection"
  ALTER COLUMN "status" TYPE "EtsyConnectionStatus"
  USING ("status"::"EtsyConnectionStatus");
ALTER TABLE "EtsyConnection" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "EtsyConnection"
  ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "refreshLeaseId" TEXT,
  ADD COLUMN "refreshLeaseUntil" TIMESTAMP(3),
  ADD COLUMN "refreshFailureCode" TEXT;
ALTER TABLE "EtsyConnection"
  ALTER COLUMN "workspaceId" SET NOT NULL,
  ALTER COLUMN "saasShopId" SET NOT NULL;

ALTER TABLE "EtsyOAuthState"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "redirectPath" TEXT NOT NULL DEFAULT '/app/settings/etsy',
  ADD COLUMN "intent" TEXT NOT NULL DEFAULT 'CONNECT',
  ADD COLUMN "requestedScopes" TEXT NOT NULL DEFAULT 'shops_r listings_r transactions_r';

ALTER TABLE "EtsySyncRun" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "EtsySyncRun"
  ALTER COLUMN "status" TYPE "EtsySyncRunStatus"
  USING ("status"::"EtsySyncRunStatus");
ALTER TABLE "EtsySyncRun" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
ALTER TABLE "EtsySyncRun"
  ADD COLUMN "jobKey" TEXT,
  ADD COLUMN "checkpoint" JSONB,
  ADD COLUMN "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastHeartbeatAt" TIMESTAMP(3),
  ADD COLUMN "pagesProcessed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recordsRead" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recordsCreated" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recordsUnchanged" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "warnings" JSONB,
  ADD COLUMN "rateLimitState" JSONB,
  ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "errorCode" TEXT,
  ADD COLUMN "sanitizedErrorMessage" TEXT;

ALTER TABLE "EtsyListingProductLink"
  ADD COLUMN "mappingMethod" TEXT NOT NULL DEFAULT 'LEGACY_AUTO',
  ADD COLUMN "mappingConfidence" DECIMAL(65,30),
  ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ALTER COLUMN "confirmedAt" DROP NOT NULL,
  ALTER COLUMN "confirmedAt" DROP DEFAULT;

UPDATE "EtsyListingProductLink"
SET "reviewStatus" = 'CONFIRMED', "mappingConfidence" = 1
WHERE "confirmedAt" IS NOT NULL;

-- Prompt 4 stops manufacturing zero for source values Etsy omitted. Existing
-- explicit numeric values are retained; future unknowns may be stored as NULL.
ALTER TABLE "EtsyReceipt"
  ALTER COLUMN "subtotalAmount" DROP NOT NULL,
  ALTER COLUMN "shippingAmount" DROP NOT NULL,
  ALTER COLUMN "discountAmount" DROP NOT NULL,
  ALTER COLUMN "giftWrapAmount" DROP NOT NULL,
  ALTER COLUMN "taxAmount" DROP NOT NULL,
  ALTER COLUMN "refundAmount" DROP NOT NULL;
ALTER TABLE "EtsyPayment"
  ALTER COLUMN "shippingAmount" DROP NOT NULL,
  ALTER COLUMN "taxAmount" DROP NOT NULL;
ALTER TABLE "EtsyReceipt"
  ADD COLUMN "cancellationStatus" TEXT,
  ADD COLUMN "refundStatus" TEXT;

CREATE UNIQUE INDEX "EtsySyncRun_jobKey_key" ON "EtsySyncRun"("jobKey");
CREATE UNIQUE INDEX "Shop_platform_externalShopId_key"
  ON "Shop"("platform", "externalShopId");
CREATE INDEX "EtsyOAuthState_userId_expiresAt_consumedAt_idx"
  ON "EtsyOAuthState"("userId", "expiresAt", "consumedAt");
CREATE UNIQUE INDEX "EtsyWebhookEvent_webhookId_key"
  ON "EtsyWebhookEvent"("webhookId");

ALTER TABLE "EtsyOAuthState"
  ADD CONSTRAINT "EtsyOAuthState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
