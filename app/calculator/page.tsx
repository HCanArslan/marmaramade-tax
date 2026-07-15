import { CalculatorWorkspace } from "@/components/calculator-workspace";
import { requireAdmin } from "@/lib/auth/require-admin";
import { resolveListingPricing } from "@/lib/etsy/pricing";
import { prisma } from "@/lib/prisma";
export default async function CalculatorPage() {
  await requireAdmin({ redirectTo: "/calculator" });
  const products = await prisma.product.findMany({
    where: { active: true, etsyListingLinks: { some: {} } },
    include: {
      costVersions: { orderBy: { effectiveFrom: "desc" }, take: 1 },
      etsyListingLinks: { include: { listing: true } },
    },
    orderBy: { sku: "asc" },
  });
  const presets = products.flatMap((product) => product.etsyListingLinks.map(({ listing }) => {
    const pricing = resolveListingPricing(listing);
    const cost = product.costVersions[0];
    return {
      id: listing.etsyListingId,
      productId: product.id,
      sku: product.sku,
      title: product.title,
      listingTitle: listing.title,
      currency: pricing.currency,
      originalPrice: pricing.originalPrice.toString(),
      discountedPrice: pricing.discountedPrice.toString(),
      discountAmount: pricing.discountAmount.toString(),
      discountPercentage: pricing.discountPercentage.toString(),
      discountSource: pricing.source,
      materialCostTry: cost?.materialCostTry.toString() || "0",
      laborHours: cost?.laborHours.toString() || "0",
      laborHourlyRateTry: cost?.laborHourlyRateTry.toString() || "0",
      packagingCostTry: cost?.packagingCostTry.toString() || "0",
      additionalDirectCostTry: cost?.additionalDirectCostTry.toString() || "0",
      hasCostVersion: Boolean(cost),
    };
  }));
  return <CalculatorWorkspace products={presets} />;
}
