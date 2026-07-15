import { CalculatorWorkspace } from "@/components/calculator-workspace";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getWeeklyUsdTryRate } from "@/lib/exchange-rate";
import { resolveListingPricing } from "@/lib/etsy/pricing";
import { prisma } from "@/lib/prisma";
export default async function CalculatorPage() {
  await requireAdmin({ redirectTo: "/calculator" });
  const [products, savedRate] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, etsyListingLinks: { some: {} } },
      include: { etsyListingLinks: { include: { listing: true } } },
      orderBy: { sku: "asc" },
    }),
    prisma.exchangeRateSnapshot.findFirst({
      where: { baseCurrency: "USD", quoteCurrency: "TRY" },
      orderBy: { capturedAt: "desc" },
    }),
  ]);
  const exchangeRate = await getWeeklyUsdTryRate(savedRate);
  const presets = products.flatMap((product) =>
    product.etsyListingLinks.map(({ listing }) => {
      const pricing = resolveListingPricing(listing);
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
        availableQuantity: listing.state === "active" ? listing.quantity : 0,
        state: listing.state,
      };
    }),
  );
  return <CalculatorWorkspace products={presets} exchangeRate={exchangeRate} />;
}
