import type { CalculatorInput } from "./types";

export interface PlanningFeeRule {
  category: string;
  percentageRate: { toString(): string } | null;
  fixedAmount: { toString(): string } | null;
  fixedCurrency: string | null;
  vatApplicable: boolean;
  vatRate: { toString(): string };
}

export function applyFeeProfile(
  input: CalculatorInput,
  rules: PlanningFeeRule[],
): CalculatorInput {
  const next = { ...input, vatApplicable: { ...input.vatApplicable } };
  for (const rule of rules) {
    const percentage = rule.percentageRate?.toString();
    const fixed = rule.fixedAmount?.toString();
    if (rule.vatApplicable) next.sellerFeeVatRate = rule.vatRate.toString();
    switch (rule.category) {
      case "LISTING":
        if (fixed && rule.fixedCurrency === "USD") next.listingFeeUsd = fixed;
        next.vatApplicable.listing = rule.vatApplicable;
        break;
      case "TRANSACTION":
        if (percentage) next.transactionRate = percentage;
        next.vatApplicable.transaction = rule.vatApplicable;
        break;
      case "PAYMENT_PROCESSING_PERCENT":
        if (percentage) next.processingRate = percentage;
        next.vatApplicable.processingPercentage = rule.vatApplicable;
        break;
      case "PAYMENT_PROCESSING_FIXED":
        if (fixed && rule.fixedCurrency === "TRY")
          next.processingFixedTry = fixed;
        next.vatApplicable.processingFixed = rule.vatApplicable;
        break;
      case "REGULATORY":
        if (percentage) next.regulatoryRate = percentage;
        next.vatApplicable.regulatory = rule.vatApplicable;
        break;
      case "CURRENCY_CONVERSION":
        if (percentage) next.conversionRate = percentage;
        next.vatApplicable.conversion = rule.vatApplicable;
        break;
      case "OFFSITE_ADS":
        if (percentage) next.offsiteAdsRate = percentage;
        next.vatApplicable.offsiteAds = rule.vatApplicable;
        break;
      case "DEPOSIT":
        if (fixed && rule.fixedCurrency === "TRY") next.depositFeeTry = fixed;
        break;
    }
  }
  return next;
}
