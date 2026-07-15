ALTER TABLE "EtsyListing"
ADD COLUMN "buyerOriginalPrice" DECIMAL(65,30),
ADD COLUMN "buyerDiscountedPrice" DECIMAL(65,30),
ADD COLUMN "buyerDiscountAmount" DECIMAL(65,30),
ADD COLUMN "buyerDiscountPercentage" DECIMAL(65,30),
ADD COLUMN "buyerHasDiscount" BOOLEAN,
ADD COLUMN "buyerPriceCurrency" TEXT,
ADD COLUMN "discountStartAt" TIMESTAMP(3),
ADD COLUMN "discountEndAt" TIMESTAMP(3),
ADD COLUMN "manualDiscountPercentage" DECIMAL(65,30);
