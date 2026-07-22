import Decimal from "decimal.js";
import { CalculatorWorkspace } from "@/components/calculator-workspace";
import { requireAdmin } from "@/lib/auth/require-admin";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import { applyFeeProfile } from "@/lib/domain/fee-profile";
import { defaultProfitabilityThresholds } from "@/lib/domain/profitability";
import {
  annualizeRecurringBusinessCost,
  monthStartUtc,
} from "@/lib/domain/overhead";
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
    shippingQuotes,
    customsQuotes,
    feeProfile,
    assumptionProfile,
    makerRole,
    etgbCosts,
    externalComparison,
    planningTaxRule,
    exportVatRule,
    recurringBusinessCosts,
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
    prisma.monthlyOverhead.findFirst({
      where: { month: { lte: monthStartUtc(now) } },
      orderBy: { month: "desc" },
    }),
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
    prisma.shippingQuote.findMany({
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
      take: 100,
    }),
    prisma.customsQuote.findMany({
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
      take: 100,
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
    prisma.businessPersonRole.findFirst({
      where: {
        role: { in: ["MAKER", "FAMILY_CONTRIBUTOR"] },
        economicHourlyRateTry: { not: null },
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      include: { person: true },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.etgbCostRecord.findMany({
      where: {
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: { effectiveFrom: "desc" },
      take: 100,
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
    prisma.recurringBusinessCost.findMany({
      where: {
        includeInSalesPlan: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  ]);

  const shipping = shippingQuotes.find((quote) => quote.productId === null);
  const customs = customsQuotes.find((quote) => quote.productId === null);
  const etgbCost = etgbCosts.find((record) => record.productId === null);

  const exchangeRate = await getWeeklyUsdTryRate(savedRate);
  const annualOverheadItems = recurringBusinessCosts.map((cost) => {
    const annualized = annualizeRecurringBusinessCost(
      {
        amount: cost.amount,
        currency: cost.currency as "TRY" | "USD",
        billingFrequency: cost.billingFrequency as "MONTHLY" | "ANNUAL",
        vatRate: cost.vatRate,
      },
      exchangeRate.rate,
    );
    return {
      id: cost.id,
      name: cost.name,
      category: cost.category,
      amount: cost.amount.toString(),
      currency: cost.currency as "TRY" | "USD",
      billingFrequency: cost.billingFrequency,
      vatRate: cost.vatRate.toString(),
      annualGrossNative: annualized.annualGrossNative.toString(),
      annualGrossTry: annualized.annualGrossTry.toString(),
      notes: cost.notes,
    };
  });
  const annualOverheadTotalTry = annualOverheadItems.reduce(
    (total, cost) => total.plus(cost.annualGrossTry),
    new Decimal(0),
  );
  const feeDefaults = applyFeeProfile(
    defaultCalculatorInput,
    feeProfile?.rules ?? [],
  );
  const presets = products.flatMap((product) => {
    const cost = product.costVersions[0];
    const productShipping =
      shippingQuotes.find((quote) => quote.productId === product.id) ??
      shipping;
    const productCustoms =
      customsQuotes.find((quote) => quote.productId === product.id) ?? customs;
    const productEtgb =
      etgbCosts.find((record) => record.productId === product.id) ?? etgbCost;
    const productCustomsDuty = productCustoms
      ? (productCustoms.customsDutyAmount ??
        productCustoms.declaredValue
          .mul(productCustoms.customsDutyRate)
          .div(100))
      : new Decimal(0);
    const productAdditionalTariff = productCustoms
      ? (productCustoms.additionalTariffAmount ??
        productCustoms.declaredValue
          .mul(productCustoms.additionalTariffRate)
          .div(100))
      : new Decimal(0);
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
        economicHourlyRateTry:
          cost?.economicHourlyRateTry?.toString() ??
          makerRole?.economicHourlyRateTry?.toString() ??
          assumptionProfile?.globalEconomicHourlyRateTry?.toString() ??
          null,
        economicHourlyRateSource: cost?.economicHourlyRateTry
          ? `Product cost version effective ${cost.effectiveFrom.toLocaleDateString("en-GB")}`
          : makerRole?.economicHourlyRateTry
            ? `Maker / family role: ${makerRole.person.displayName ?? makerRole.person.fullName}`
            : assumptionProfile?.globalEconomicHourlyRateTry
              ? `Global profitability setting: ${assumptionProfile.name}`
              : "Not configured",
        productionHoursSource: cost
          ? `Product cost version effective ${cost.effectiveFrom.toLocaleDateString("en-GB")}`
          : "Not configured",
        paidLaborRateSource: cost
          ? `Product cost version effective ${cost.effectiveFrom.toLocaleDateString("en-GB")}`
          : "Not configured",
        packagingCostTry: cost?.packagingCostTry.toString() ?? "0",
        additionalDirectCostTry: otherDirectCosts.toString(),
        internationalShippingUsd: productShipping
          ? productShipping.shippingCost
              .minus(productShipping.insuranceCost)
              .toString()
          : "0",
        shippingInsuranceUsd: productShipping?.insuranceCost.toString() ?? "0",
        customsDutyUsd: productCustomsDuty.toString(),
        additionalTariffUsd: productAdditionalTariff.toString(),
        carrierProcessingFeeUsd:
          productCustoms?.carrierProcessingFee.toString() ?? "0",
        brokerageFeeUsd: productCustoms?.brokerageFee.toString() ?? "0",
        customsClearanceFeeUsd:
          productCustoms?.customsClearanceFee.toString() ?? "0",
        destinationFeesUsd: productCustoms
          ? productCustoms.otherDestinationFee
              .plus(productCustoms.destinationTax)
              .plus(productCustoms.insuranceFee)
              .toString()
          : "0",
        includeCustomsInSellerProfit:
          productCustoms?.includeInSellerProfit ??
          assumptionProfile?.includeCustomsInSellerProfit ??
          false,
        etgbCostUsd:
          productEtgb?.actualFeeUsd?.toString() ??
          productEtgb?.estimatedFeeUsd?.toString() ??
          assumptionProfile?.estimatedEtgbFeeUsd?.toString() ??
          "0",
        includeEtgbInSellerProfit:
          productEtgb?.deductFromProfit ??
          assumptionProfile?.includeEtgbInSellerProfit ??
          false,
        etgbStatus: productEtgb?.status ?? "UNKNOWN_PENDING_CONFIRMATION",
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
      profitabilityThresholds={
        assumptionProfile
          ? {
              gradeAProfitUsd: assumptionProfile.gradeAProfitUsd.toString(),
              gradeAMarginPercent:
                assumptionProfile.gradeAMarginPercent.toString(),
              gradeBProfitUsd: assumptionProfile.gradeBProfitUsd.toString(),
              gradeBMarginPercent:
                assumptionProfile.gradeBMarginPercent.toString(),
              gradeCProfitUsd: assumptionProfile.gradeCProfitUsd.toString(),
              gradeCMarginPercent:
                assumptionProfile.gradeCMarginPercent.toString(),
              criticalMarginPercent:
                assumptionProfile.criticalMarginPercent.toString(),
              lowProfitUsd: assumptionProfile.lowProfitUsd.toString(),
              shippingHeavyPercent:
                assumptionProfile.shippingHeavyPercent.toString(),
              overheadHeavyPercent:
                assumptionProfile.overheadHeavyPercent.toString(),
              minimumCashProfitUsd:
                assumptionProfile.minimumCashProfitUsd.toString(),
              minimumEconomicProfitUsd:
                assumptionProfile.minimumEconomicProfitUsd.toString(),
              minimumCashMarginPercent:
                assumptionProfile.minimumCashMarginPercent.toString(),
              minimumEconomicMarginPercent:
                assumptionProfile.minimumEconomicMarginPercent.toString(),
              minimumCashProfitPerHourUsd:
                assumptionProfile.minimumCashProfitPerHourUsd.toString(),
              minimumEconomicProfitPerHourUsd:
                assumptionProfile.minimumEconomicProfitPerHourUsd.toString(),
            }
          : defaultProfitabilityThresholds
      }
      profitabilityTargetsSource={
        assumptionProfile
          ? `Effective profitability profile: ${assumptionProfile.name}`
          : "Built-in editable defaults; save a profitability profile in Settings"
      }
      annualOverheadEvidence={
        annualOverheadItems.length > 0
          ? {
              annualTotalTry: annualOverheadTotalTry.toString(),
              usdTryRate: exchangeRate.rate,
              items: annualOverheadItems,
            }
          : null
      }
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
        shipping: shippingQuotes.some((quote) => quote.productId)
          ? `Product-specific parcel quotes saved for ${new Set(shippingQuotes.filter((quote) => quote.productId).map((quote) => quote.productId)).size} product(s); Calculator loads the selected product's dimensions and price`
          : shipping
            ? `${shipping.planningDefault ? "Planning default" : "Latest saved fallback"}: ${shipping.carrier} · ${shipping.serviceName} · ${shipping.destinationCountry} · ${shipping.quoteDate.toLocaleDateString("en-GB")}`
            : "No current non-example USD shipping quote",
        customs: customsQuotes.some((quote) => quote.productId)
          ? `Product-specific customs quotes saved for ${new Set(customsQuotes.filter((quote) => quote.productId).map((quote) => quote.productId)).size} product(s); Calculator loads the selected product's quote`
          : customs
            ? `Latest current quote: ${customs.destinationCountry} · ${customs.hsCode} · ${customs.quoteDate.toLocaleDateString("en-GB")}`
            : "No current non-example USD customs quote",
        overhead:
          annualOverheadItems.length > 0
            ? `${annualOverheadItems.length} active recurring business cost(s), annualized at ${exchangeRate.rate} TRY/USD`
            : "No annual recurring business costs configured; no Sales Plan overhead deducted",
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
        internationalShippingUsd: shipping
          ? shipping.shippingCost.minus(shipping.insuranceCost).toString()
          : "0",
        shippingInsuranceUsd: shipping?.insuranceCost.toString() ?? "0",
        customsDutyUsd: customsDuty.toString(),
        additionalTariffUsd: additionalTariff.toString(),
        carrierProcessingFeeUsd:
          customs?.carrierProcessingFee.toString() ?? "0",
        brokerageFeeUsd: customs?.brokerageFee.toString() ?? "0",
        customsClearanceFeeUsd: customs?.customsClearanceFee.toString() ?? "0",
        destinationFeesUsd: customs
          ? customs.otherDestinationFee
              .plus(customs.destinationTax)
              .plus(customs.insuranceFee)
              .toString()
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
