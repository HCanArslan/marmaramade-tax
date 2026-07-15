import Decimal from "decimal.js";

export interface ListingPriceFields {
  priceAmount: { toString(): string };
  priceCurrency: string;
  buyerOriginalPrice: { toString(): string } | null;
  buyerDiscountedPrice: { toString(): string } | null;
  buyerDiscountAmount: { toString(): string } | null;
  buyerDiscountPercentage: { toString(): string } | null;
  buyerHasDiscount: boolean | null;
  buyerPriceCurrency: string | null;
  manualDiscountPercentage: { toString(): string } | null;
}

export function resolveListingPricing(listing: ListingPriceFields) {
  const originalPrice = new Decimal(listing.buyerOriginalPrice?.toString() ?? listing.priceAmount.toString());
  const manualPercentage = listing.manualDiscountPercentage == null ? null : new Decimal(listing.manualDiscountPercentage.toString());
  const etsyPercentage = listing.buyerDiscountPercentage == null ? null : new Decimal(listing.buyerDiscountPercentage.toString());
  const hasImportedDiscount = Boolean(listing.buyerHasDiscount && listing.buyerDiscountedPrice);

  if (manualPercentage != null) {
    const discountAmount = originalPrice.mul(manualPercentage).div(100);
    return {
      originalPrice,
      discountedPrice: Decimal.max(originalPrice.minus(discountAmount), 0),
      discountAmount,
      discountPercentage: manualPercentage,
      currency: listing.buyerPriceCurrency || listing.priceCurrency,
      source: "MANUAL" as const,
    };
  }

  if (hasImportedDiscount) {
    const discountedPrice = new Decimal(listing.buyerDiscountedPrice!.toString());
    const discountAmount = listing.buyerDiscountAmount
      ? new Decimal(listing.buyerDiscountAmount.toString())
      : Decimal.max(originalPrice.minus(discountedPrice), 0);
    const discountPercentage = etsyPercentage ?? (originalPrice.gt(0) ? discountAmount.div(originalPrice).mul(100) : new Decimal(0));
    return {
      originalPrice,
      discountedPrice,
      discountAmount,
      discountPercentage,
      currency: listing.buyerPriceCurrency || listing.priceCurrency,
      source: "ETSY" as const,
    };
  }

  return {
    originalPrice,
    discountedPrice: originalPrice,
    discountAmount: new Decimal(0),
    discountPercentage: new Decimal(0),
    currency: listing.priceCurrency,
    source: "NONE" as const,
  };
}
