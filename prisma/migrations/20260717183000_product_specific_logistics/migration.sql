ALTER TABLE "ShippingQuote" ADD COLUMN "productId" TEXT;
ALTER TABLE "CustomsQuote" ADD COLUMN "productId" TEXT;
ALTER TABLE "CustomsProfile" ADD COLUMN "productId" TEXT;
ALTER TABLE "TariffVersion" ADD COLUMN "productId" TEXT;
ALTER TABLE "EtgbCostRecord" ADD COLUMN "productId" TEXT;
ALTER TABLE "MicroExportCase" ADD COLUMN "productId" TEXT;

ALTER TABLE "ShippingQuote" ADD CONSTRAINT "ShippingQuote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomsQuote" ADD CONSTRAINT "CustomsQuote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomsProfile" ADD CONSTRAINT "CustomsProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TariffVersion" ADD CONSTRAINT "TariffVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EtgbCostRecord" ADD CONSTRAINT "EtgbCostRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MicroExportCase" ADD CONSTRAINT "MicroExportCase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ShippingQuote_productId_destinationCountry_quoteDate_idx" ON "ShippingQuote"("productId", "destinationCountry", "quoteDate");
CREATE INDEX "CustomsQuote_productId_destinationCountry_quoteDate_idx" ON "CustomsQuote"("productId", "destinationCountry", "quoteDate");
CREATE INDEX "CustomsProfile_productId_effectiveFrom_effectiveTo_idx" ON "CustomsProfile"("productId", "effectiveFrom", "effectiveTo");
CREATE INDEX "TariffVersion_productId_effectiveFrom_effectiveTo_idx" ON "TariffVersion"("productId", "effectiveFrom", "effectiveTo");
CREATE INDEX "EtgbCostRecord_productId_effectiveFrom_effectiveTo_idx" ON "EtgbCostRecord"("productId", "effectiveFrom", "effectiveTo");
CREATE INDEX "MicroExportCase_productId_status_etgbStatus_idx" ON "MicroExportCase"("productId", "status", "etgbStatus");

DROP INDEX "TariffVersion_hsCode_originCountry_destinationCountry_effectiveFrom_key";
CREATE UNIQUE INDEX "TariffVersion_productId_hsCode_originCountry_destinationCountry_effectiveFrom_key" ON "TariffVersion"("productId", "hsCode", "originCountry", "destinationCountry", "effectiveFrom");
