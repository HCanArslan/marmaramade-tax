import Decimal from "decimal.js";
import { CalculatorWorkspace } from "@/components/calculator-workspace";
import { requireAdmin } from "@/lib/auth/require-admin";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import { applyFeeProfile } from "@/lib/domain/fee-profile";
import { getWeeklyUsdTryRate } from "@/lib/exchange-rate";
import { resolveListingPricing } from "@/lib/etsy/pricing";
import { prisma } from "@/lib/prisma";

export default async function CalculatorPage() {
  await requireAdmin({ redirectTo: "/calculator" });
  const now = new Date();
  const [
    products,
    savedRate,
    overhead,
    businessProfile,
    legalProfile,
    shipping,
    customs,
    feeProfile,
    assumptionProfile,
    etgbCost,
    externalComparison,
    planningTaxRule,
    exportVatRule,
  ] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, etsyListingLinks: { some: {} } },
      include: {
        etsyListingLinks: { include: { listing: true } },
        costVersions: { orderBy: { effectiveFrom: "desc" }, take: 1 },
      },
      orderBy: { sku: "asc" },
    }),
    prisma.exchangeRateSnapshot.findFirst({
      where: { baseCurrency: "USD", quoteCurrency: "TRY" },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.monthlyOverhead.findFirst({ orderBy: { month: "desc" } }),
    prisma.businessProfileVersion.findFirst({
      where: {
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.legalOperatingProfile.findFirst({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.shippingQuote.findFirst({
      where: {
        shippingCurrency: "USD",
        OR: [{ expirationDate: null }, { expirationDate: { gte: now } }],
        AND: [
          {
            OR: [
              { source: null },
              {
                source: {
                  not: { contains: "example" },
                },
              },
            ],
          },
          {
            OR: [
              { notes: null },
              {
                notes: {
                  not: { contains: "example" },
                },
              },
            ],
          },
        ],
      },
      orderBy: [{ planningDefault: "desc" }, { quoteDate: "desc" }],
    }),
    prisma.customsQuote.findFirst({
      where: {
        declaredValueCurrency: "USD",
        OR: [{ expirationDate: null }, { expirationDate: { gte: now } }],
        AND: [
          {
            OR: [
              { source: null },
              {
                source: {
                  not: { contains: "example" },
                },
              },
            ],
          },
          {
            OR: [
              { notes: null },
              {
                notes: {
                  not: { contains: "example" },
                },
              },
            ],
          },
        ],
      },
      orderBy: { quoteDate: "desc" },
    }),
    prisma.feeProfile.findFirst({
      where: { marketplace: "Etsy", country: "TR" },
      include: { rules: true },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.costAssumptionProfile.findFirst({
      where: {
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.etgbCostRecord.findFirst({
      where: {
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.externalCalculatorComparison.findFirst({
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.taxRuleVersion.findFirst({
      where: {
        purpose: "PLANNING_RESERVE",
        isPlanningDefault: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.taxRuleVersion.findFirst({
      where: {
        taxType: "EXPORT_VAT",
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);

  const exchangeRate = await getWeeklyUsdTryRate(savedRate);
  const feeDefaults = applyFeeProfile(
    defaultCalculatorInput,
    feeProfile?.rules ?? [],
  );
  const presets = products.flatMap((product) => {
    const cost = product.costVersions[0];
    const materialWithWastage = cost
      ? cost.materialCostTry.plus(
          cost.materialCostTry.mul(cost.wastageRate).div(100),
        )
      : new Decimal(0);
    const otherDirectCosts = cost
      ? cost.additionalDirectCostTry
          .plus(cost.additionalMakerPaymentTry)
          .plus(cost.allocatedEquipmentCostTry)
      : new Decimal(0);
    return product.etsyListingLinks.map(({ listing }) => {
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
        materialCostTry: materialWithWastage.toString(),
        laborHours: cost?.laborHours.toString() ?? "0",
        laborHourlyRateTry: cost?.laborHourlyRateTry.toString() ?? "0",
        packagingCostTry: cost?.packagingCostTry.toString() ?? "0",
        additionalDirectCostTry: otherDirectCosts.toString(),
      };
    });
  });

  const monthlyOverhead = overhead
    ? new Decimal(overhead.accountantTry.toString())
        .plus(overhead.socialSecurityTry.toString())
        .plus(overhead.softwareTry.toString())
        .plus(overhead.bankingTry.toString())
        .plus(overhead.officeTry.toString())
        .plus(overhead.otherTry.toString())
        .plus(overhead.etsyPlusTry.toString())
    : businessProfile
      ? businessProfile.accountantMonthlyTry
          .plus(businessProfile.socialSecurityMonthlyTry)
          .plus(businessProfile.invoicingSoftwareMonthlyTry)
          .plus(businessProfile.bankingMonthlyTry)
          .plus(businessProfile.officeMonthlyTry)
          .plus(businessProfile.otherMonthlyBusinessCostsTry)
      : new Decimal(0);
  const customsDuty = customs
    ? (customs.customsDutyAmount ??
      customs.declaredValue.mul(customs.customsDutyRate).div(100))
    : new Decimal(0);
  const additionalTariff = customs
    ? (customs.additionalTariffAmount ??
      customs.declaredValue.mul(customs.additionalTariffRate).div(100))
    : new Decimal(0);

  return (
    <CalculatorWorkspace
      products={presets}
      exchangeRate={exchangeRate}
      externalComparison={
        externalComparison
          ? {
              provider: externalComparison.provider,
              marketplaceCommissionUsd:
                externalComparison.marketplaceCommissionUsd.toString(),
              paymentCommissionUsd:
                externalComparison.paymentCommissionUsd.toString(),
              otherCommissionUsd:
                externalComparison.otherCommissionUsd.toString(),
            }
          : null
      }
      planningSources={{
        products: "Latest saved cost version for each product",
        shipping: shipping
          ? `${shipping.planningDefault ? "Planning default" : "Latest saved fallback"}: ${shipping.carrier} · ${shipping.serviceName} · ${shipping.destinationCountry} · ${shipping.quoteDate.toLocaleDateString("en-GB")}`
          : "No current non-example USD shipping quote",
        customs: customs
          ? `Latest current quote: ${customs.destinationCountry} · ${customs.hsCode} · ${customs.quoteDate.toLocaleDateString("en-GB")}`
          : "No current non-example USD customs quote",
        overhead: overhead
          ? `Monthly overhead saved for ${overhead.month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
          : businessProfile
            ? `Fallback from business profile: ${businessProfile.name}`
            : "No monthly overhead or current business profile",
        fees: feeProfile
          ? `Etsy fee profile: ${feeProfile.name}`
          : "Built-in Etsy planning assumptions; save the official profile",
        tax: planningTaxRule?.rate
          ? `${planningTaxRule.name}: ${planningTaxRule.rate.toString()}% cash-planning reserve (not an additional filed tax)${exportVatRule ? ` · ${exportVatRule.name}; ${exportVatRule.evidenceRequirement ?? "export evidence required"}` : ""}`
          : legalProfile
            ? `Legal profile fallback: ${legalProfile.name} · ${legalProfile.incomeTaxReserveRate.toString()}% planning reserve`
            : "No current tax planning reserve",
        reserves:
          "Return, damage, exchange-loss and domestic-logistics assumptions from Quick calculator",
      }}
      planningDefaults={{
        ...feeDefaults,
        monthlyOverheadTry: monthlyOverhead.toString(),
        expectedMonthlyOrders: String(
          overhead?.expectedSales ||
            legalProfile?.expectedMonthlyOrders ||
            businessProfile?.expectedMonthlyOrders ||
            1,
        ),
        taxReserveRate:
          planningTaxRule?.rate?.toString() ??
          legalProfile?.incomeTaxReserveRate.toString() ??
          "0",
        businessStatus:
          legalProfile?.operatingMode === "SOLE_PROPRIETORSHIP"
            ? "SOLE_PROPRIETORSHIP"
            : "INDIVIDUAL_UNREGISTERED",
        vatTreatment:
          legalProfile?.sellerFeeVatTreatment === "ETSY_CHARGES_SELLER_FEE_VAT"
            ? "CHARGED_BY_ETSY"
            : "ACCOUNTANT_MANAGED",
        internationalShippingUsd: shipping?.shippingCost.toString() ?? "0",
        shippingInsuranceUsd: shipping?.insuranceCost.toString() ?? "0",
        customsDutyUsd: customsDuty.toString(),
        additionalTariffUsd: additionalTariff.toString(),
        carrierProcessingFeeUsd:
          customs?.carrierProcessingFee.toString() ?? "0",
        brokerageFeeUsd: customs?.brokerageFee.toString() ?? "0",
        customsClearanceFeeUsd: customs?.customsClearanceFee.toString() ?? "0",
        destinationFeesUsd: customs
          ? customs.otherDestinationFee.plus(customs.destinationTax).toString()
          : "0",
        includeCustomsInSellerProfit:
          customs?.includeInSellerProfit ??
          assumptionProfile?.includeCustomsInSellerProfit ??
          false,
        etgbCostUsd:
          etgbCost?.actualFeeUsd?.toString() ??
          etgbCost?.estimatedFeeUsd?.toString() ??
          assumptionProfile?.estimatedEtgbFeeUsd?.toString() ??
          "0",
        includeEtgbInSellerProfit:
          etgbCost?.deductFromProfit ??
          assumptionProfile?.includeEtgbInSellerProfit ??
          false,
        overheadAllocationMethod:
          overhead?.allocationMethod ?? "EXPECTED_SALES",
        actualMonthlyOrders: String(overhead?.actualSales ?? 0),
        manualOverheadPerOrderTry:
          overhead?.manualPerOrderTry?.toString() ?? "0",
      }}
    />
  );
}
