CREATE TABLE "RecurringBusinessCost" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TRY',
  "billingFrequency" TEXT NOT NULL DEFAULT 'ANNUAL',
  "vatRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "includeInSalesPlan" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RecurringBusinessCost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecurringBusinessCost_effectiveFrom_effectiveTo_idx"
  ON "RecurringBusinessCost"("effectiveFrom", "effectiveTo");

CREATE INDEX "RecurringBusinessCost_includeInSalesPlan_idx"
  ON "RecurringBusinessCost"("includeInSalesPlan");
