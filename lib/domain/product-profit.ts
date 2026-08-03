import Decimal from "decimal.js";
import { defaultCalculatorInput } from "./defaults";
import { applyFeeProfile, type PlanningFeeRule } from "./fee-profile";
import { d } from "./money";
import { analyzeProfitability, solveProfitabilityTarget } from "./profitability";

export type InputClassification = "KNOWN" | "ESTIMATED" | "UNKNOWN" | "NOT_APPLICABLE";
export type ProductCalculationStatus = "COMPLETE" | "ESTIMATED" | "INCOMPLETE" | "NEEDS_REVIEW";

export type ResolvedInput<T> = Readonly<{
  value: T | null;
  classification: InputClassification;
  source: string;
  versionId?: string | null;
}>;

export type ProductProfitInput = Readonly<{
  productId: string;
  listingId: string | null;
  destinationCountry: string;
  marketplaceCurrency: string;
  costCurrency: string;
  reportingCurrency: string;
  price: ResolvedInput<Decimal.Value>;
  materialCost: ResolvedInput<Decimal.Value>;
  labourHours: ResolvedInput<Decimal.Value>;
  cashLabourRate: ResolvedInput<Decimal.Value>;
  economicLabourRate: ResolvedInput<Decimal.Value>;
  packagingCost: ResolvedInput<Decimal.Value>;
  otherDirectCost: ResolvedInput<Decimal.Value>;
  shippingCost: ResolvedInput<Decimal.Value>;
  customsCost: ResolvedInput<Decimal.Value>;
  exportHandlingCost: ResolvedInput<Decimal.Value>;
  monthlyOverhead: ResolvedInput<Decimal.Value>;
  expectedMonthlyOrders: ResolvedInput<Decimal.Value>;
  exchangeRate: ResolvedInput<Decimal.Value>;
  feeRules: readonly PlanningFeeRule[];
  feeProfileId: string | null;
  customsResponsibility: "SELLER" | "BUYER" | "UNKNOWN";
  targetMarginPercent: Decimal.Value;
  taxReserveRate?: ResolvedInput<Decimal.Value>;
}>;

const requiredKeys = ["price", "materialCost", "labourHours", "cashLabourRate", "packagingCost", "shippingCost", "exchangeRate"] as const;

function inputValue(input: ResolvedInput<Decimal.Value>) {
  return input.value === null ? null : d(input.value);
}

function reportingMultiplier(input: ProductProfitInput, rate: Decimal) {
  if (input.reportingCurrency === input.marketplaceCurrency) return d(1);
  if (input.reportingCurrency === input.costCurrency) return rate;
  return null;
}

function serializableInput(input: ProductProfitInput) {
  const entries = Object.entries(input).filter(([, value]) => value && typeof value === "object" && "classification" in value);
  return Object.fromEntries(entries.map(([key, value]) => {
    const resolved = value as ResolvedInput<Decimal.Value>;
    return [key, { ...resolved, value: resolved.value === null ? null : d(resolved.value).toString() }];
  }));
}

export function calculateProductProfit(input: ProductProfitInput) {
  const missingFields: string[] = requiredKeys.filter((key) => input[key].value === null || input[key].classification === "UNKNOWN");
  const warnings = missingFields.map((key) => `${key} is missing.`);
  if (!input.feeProfileId || input.feeRules.length === 0) {
    missingFields.push("feeProfile");
    warnings.push("Etsy fee profile is missing.");
  }
  const unsupportedFeeCurrency = input.feeRules.some((rule) => rule.fixedCurrency && ![input.marketplaceCurrency, input.costCurrency].includes(rule.fixedCurrency));
  if (unsupportedFeeCurrency) {
    missingFields.push("feeCurrency");
    warnings.push("A fixed Etsy fee uses a currency outside the captured calculation pair.");
  }
  if (input.customsResponsibility === "SELLER" && input.customsCost.value === null) {
    missingFields.push("customsCost");
    warnings.push("Seller-paid customs cost is missing.");
  }
  if (input.customsResponsibility === "UNKNOWN") warnings.push("Customs responsibility is unknown; customs exposure is not deducted.");
  if (input.taxReserveRate?.classification === "UNKNOWN") warnings.push("Tax-planning reserve is not configured; pre-tax cash profit remains available.");
  if (input.monthlyOverhead.classification === "UNKNOWN") warnings.push("Monthly overhead is unknown and is not included.");
  if (input.economicLabourRate.classification === "UNKNOWN") warnings.push("Economic labour value is unknown.");

  const knownCount = requiredKeys.length - new Set(missingFields).size;
  const completenessScore = Math.max(0, Math.round((knownCount / requiredKeys.length) * 100));
  const rate = inputValue(input.exchangeRate);
  const multiplier = rate ? reportingMultiplier(input, rate) : null;
  const unsupportedPair = rate !== null && multiplier === null;
  if (unsupportedPair) warnings.push("The captured exchange rate does not cover the reporting currency.");
  if (missingFields.length > 0 || !rate || unsupportedPair) {
    return {
      status: unsupportedPair ? "NEEDS_REVIEW" as const : "INCOMPLETE" as const,
      completenessScore,
      missingFields: [...new Set(missingFields)],
      warnings: [...new Set(warnings)],
      inputSnapshot: serializableInput(input),
      result: null,
      recommendations: null,
    };
  }

  const taxRate = input.taxReserveRate?.value ?? 0;
  const mappedFeeRules = input.feeRules.map((rule) => ({
    ...rule,
    fixedCurrency: rule.fixedCurrency === input.marketplaceCurrency ? "USD" : rule.fixedCurrency === input.costCurrency ? "TRY" : rule.fixedCurrency,
  }));
  const calculatorInput = applyFeeProfile({
    ...defaultCalculatorInput,
    itemSubtotalUsd: inputValue(input.price)!,
    materialCostTry: inputValue(input.materialCost)!,
    laborHours: inputValue(input.labourHours)!,
    laborHourlyRateTry: inputValue(input.cashLabourRate)!,
    packagingCostTry: inputValue(input.packagingCost)!,
    additionalDirectCostTry: inputValue(input.otherDirectCost) ?? 0,
    internationalShippingUsd: input.shippingCost.source.endsWith(`:${input.costCurrency}`)
      ? inputValue(input.shippingCost)!.div(rate)
      : inputValue(input.shippingCost)!,
    customsDutyUsd: input.customsCost.value === null ? 0 : input.customsCost.source.endsWith(`:${input.costCurrency}`)
      ? inputValue(input.customsCost)!.div(rate)
      : inputValue(input.customsCost)!,
    includeCustomsInSellerProfit: input.customsResponsibility === "SELLER" && input.customsCost.value !== null,
    etgbCostUsd: input.exportHandlingCost.value === null ? 0 : inputValue(input.exportHandlingCost)!.div(rate),
    includeEtgbInSellerProfit: input.exportHandlingCost.value !== null,
    monthlyOverheadTry: input.monthlyOverhead.value ?? 0,
    expectedMonthlyOrders: input.expectedMonthlyOrders.value ?? 1,
    taxReserveRate: taxRate,
    useMicroExportIncomeTaxBenefit: false,
    usdTryRate: rate,
    currencyConversionRequired: input.marketplaceCurrency !== input.costCurrency,
  }, mappedFeeRules);

  const analysis = analyzeProfitability({
    calculatorInput,
    economicHourlyRateTry: input.economicLabourRate.value,
    customsSensitive: input.customsResponsibility !== "BUYER",
  });
  const toReporting = (value: Decimal | null) => value === null ? null : value.mul(multiplier!);
  const costToReporting = (value: Decimal | null) => value === null ? null : input.reportingCurrency === input.costCurrency ? value : value.div(rate);
  const sourceToReporting = (value: Decimal | null, source: string) => source.endsWith(`:${input.costCurrency}`) ? costToReporting(value) : toReporting(value);
  const taxUnknown = input.taxReserveRate?.classification === "UNKNOWN";
  const preTax = toReporting(analysis.calculation.totals.estimatedPreTaxProfit)!;
  const finalCash = taxUnknown ? preTax : toReporting(analysis.cashProfit)!;
  const economic = toReporting(analysis.economicProfit);
  const target = d(input.targetMarginPercent);
  const breakEven = solveProfitabilityTarget({ calculatorInput, economicHourlyRateTry: input.economicLabourRate.value, target: { kind: "cashProfit", value: 0 } });
  const minimum = solveProfitabilityTarget({ calculatorInput, economicHourlyRateTry: input.economicLabourRate.value, target: { kind: "cashMargin", value: 10 } });
  const targetPrice = solveProfitabilityTarget({ calculatorInput, economicHourlyRateTry: input.economicLabourRate.value, target: { kind: "cashMargin", value: target } });
  const currentPrice = inputValue(input.price)!;
  const recommended = targetPrice.price ? Decimal.max(currentPrice, targetPrice.price) : currentPrice;
  const usedEstimate = Object.values(serializableInput(input)).some((value) => value.classification === "ESTIMATED");

  return {
    status: usedEstimate ? "ESTIMATED" as const : "COMPLETE" as const,
    completenessScore,
    missingFields: [],
    warnings: [...new Set([...warnings, ...analysis.warnings])],
    inputSnapshot: serializableInput(input),
    result: {
      grossRevenue: toReporting(analysis.calculation.totals.grossRevenue)!,
      etsyFees: toReporting(analysis.calculation.totals.totalEtsyFees)!,
      productCashCost: toReporting(analysis.calculation.totals.directProductCostUsd)!,
      labourCost: toReporting(analysis.calculation.totals.laborUsd)!,
      economicLabourCost: input.economicLabourRate.value === null ? null : costToReporting(inputValue(input.labourHours)!.mul(inputValue(input.economicLabourRate)!)),
      packagingCost: costToReporting(inputValue(input.packagingCost)!)!,
      shippingCost: sourceToReporting(inputValue(input.shippingCost), input.shippingCost.source)!,
      customsExposure: toReporting(analysis.calculation.totals.customsExposureUsd)!,
      sellerPaidCustoms: toReporting(analysis.calculation.totals.customsAndTariffUsd)!,
      overhead: toReporting(analysis.calculation.totals.allocatedBusinessOverheadUsd)!,
      reserves: toReporting(analysis.calculation.totals.taxReserve.plus(analysis.calculation.totals.grossRevenue.mul(calculatorInput.returnReserveRate).div(100)).plus(analysis.calculation.totals.grossRevenue.mul(calculatorInput.damageReserveRate).div(100)))!,
      preTaxCashProfit: preTax,
      taxReserve: taxUnknown ? null : toReporting(analysis.calculation.totals.taxReserve)!,
      finalCashProfit: finalCash,
      economicProfit: economic,
      cashMarginPercent: analysis.cashMarginPercent,
      economicMarginPercent: analysis.economicMarginPercent,
      reportingCurrency: input.reportingCurrency,
      lines: analysis.calculation.lines.map((line) => ({ ...line, nativeCurrency: line.nativeCurrency === "USD" ? input.marketplaceCurrency : input.costCurrency })),
    },
    recommendations: {
      currentPrice,
      breakEvenPrice: breakEven.price,
      minimumViablePrice: minimum.price,
      targetMarginPrice: targetPrice.price,
      recommendedPrice: recommended,
      marketplaceCurrency: input.marketplaceCurrency,
    },
  };
}

export function calculatePortfolio(rows: readonly { quantity: number; calculation: ReturnType<typeof calculateProductProfit> }[]) {
  const complete = rows.filter((row) => row.calculation.result !== null);
  const total = (select: (result: NonNullable<(typeof complete)[number]["calculation"]["result"]>) => Decimal | null) => complete.reduce((sum, row) => {
    const value = select(row.calculation.result!);
    return value === null ? sum : sum.plus(value.mul(row.quantity));
  }, d(0));
  return {
    perProduct: rows,
    includedCount: complete.length,
    excludedCount: rows.length - complete.length,
    totalRevenue: total((result) => result.grossRevenue),
    totalEtsyFees: total((result) => result.etsyFees),
    totalProductCost: total((result) => result.productCashCost),
    totalShipping: total((result) => result.shippingCost),
    totalCustoms: total((result) => result.sellerPaidCustoms),
    cashProfit: total((result) => result.finalCashProfit),
    economicProfit: complete.every((row) => row.calculation.result!.economicProfit !== null) ? total((result) => result.economicProfit) : null,
    warnings: [...new Set(rows.flatMap((row) => row.calculation.warnings))],
  };
}
