-- Recovery-safe because an earlier production attempt may have applied statements
-- before failing on PostgreSQL's truncated legacy index name.
ALTER TABLE "ShippingQuote" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "CustomsQuote" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "CustomsProfile" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "TariffVersion" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "EtgbCostRecord" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "MicroExportCase" ADD COLUMN IF NOT EXISTS "productId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShippingQuote_productId_fkey') THEN
    ALTER TABLE "ShippingQuote" ADD CONSTRAINT "ShippingQuote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomsQuote_productId_fkey') THEN
    ALTER TABLE "CustomsQuote" ADD CONSTRAINT "CustomsQuote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomsProfile_productId_fkey') THEN
    ALTER TABLE "CustomsProfile" ADD CONSTRAINT "CustomsProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TariffVersion_productId_fkey') THEN
    ALTER TABLE "TariffVersion" ADD CONSTRAINT "TariffVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EtgbCostRecord_productId_fkey') THEN
    ALTER TABLE "EtgbCostRecord" ADD CONSTRAINT "EtgbCostRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MicroExportCase_productId_fkey') THEN
    ALTER TABLE "MicroExportCase" ADD CONSTRAINT "MicroExportCase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ShippingQuote_productId_destinationCountry_quoteDate_idx" ON "ShippingQuote"("productId", "destinationCountry", "quoteDate");
CREATE INDEX IF NOT EXISTS "CustomsQuote_productId_destinationCountry_quoteDate_idx" ON "CustomsQuote"("productId", "destinationCountry", "quoteDate");
CREATE INDEX IF NOT EXISTS "CustomsProfile_productId_effectiveFrom_effectiveTo_idx" ON "CustomsProfile"("productId", "effectiveFrom", "effectiveTo");
CREATE INDEX IF NOT EXISTS "TariffVersion_productId_effectiveFrom_effectiveTo_idx" ON "TariffVersion"("productId", "effectiveFrom", "effectiveTo");
CREATE INDEX IF NOT EXISTS "EtgbCostRecord_productId_effectiveFrom_effectiveTo_idx" ON "EtgbCostRecord"("productId", "effectiveFrom", "effectiveTo");
CREATE INDEX IF NOT EXISTS "MicroExportCase_productId_status_etgbStatus_idx" ON "MicroExportCase"("productId", "status", "etgbStatus");

DROP INDEX IF EXISTS "TariffVersion_hsCode_originCountry_destinationCountry_effec_key";
CREATE UNIQUE INDEX IF NOT EXISTS "TariffVersion_productId_hsCode_originCountry_destinationCountry_effectiveFrom_key" ON "TariffVersion"("productId", "hsCode", "originCountry", "destinationCountry", "effectiveFrom");
