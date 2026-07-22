import Decimal from "decimal.js";
import { calculate, type CalculationResult } from "./calculator";
import { d, roundMoney } from "./money";
import type { DecimalInput } from "./money";
import type { CalculatorInput } from "./types";

export type ProfitabilityGrade = "A" | "B" | "C" | "D";
export type ProfitabilityRiskFlag =
  | "CRITICAL_MARGIN"
  | "LOW_PROFIT"
  | "NEGATIVE_PROFIT"
  | "ECONOMIC_LOSS"
  | "LABOUR_DATA_MISSING"
  | "SHIPPING_HEAVY"
  | "OVERHEAD_HEAVY"
  | "CUSTOMS_SENSITIVE";

export interface ProfitabilityThresholds {
  gradeAProfitUsd: DecimalInput;
  gradeAMarginPercent: DecimalInput;
  gradeBProfitUsd: DecimalInput;
  gradeBMarginPercent: DecimalInput;
  gradeCProfitUsd: DecimalInput;
  gradeCMarginPercent: DecimalInput;
  criticalMarginPercent: DecimalInput;
  lowProfitUsd: DecimalInput;
  shippingHeavyPercent: DecimalInput;
  overheadHeavyPercent: DecimalInput;
  minimumCashProfitUsd: DecimalInput;
  minimumEconomicProfitUsd: DecimalInput;
  minimumCashMarginPercent: DecimalInput;
  minimumEconomicMarginPercent: DecimalInput;
  minimumCashProfitPerHourUsd: DecimalInput;
  minimumEconomicProfitPerHourUsd: DecimalInput;
}

export const defaultProfitabilityThresholds: ProfitabilityThresholds = {
  gradeAProfitUsd: "50",
  gradeAMarginPercent: "25",
  gradeBProfitUsd: "30",
  gradeBMarginPercent: "15",
  gradeCProfitUsd: "20",
  gradeCMarginPercent: "10",
  criticalMarginPercent: "5",
  lowProfitUsd: "15",
  shippingHeavyPercent: "25",
  overheadHeavyPercent: "20",
  minimumCashProfitUsd: "15",
  minimumEconomicProfitUsd: "15",
  minimumCashMarginPercent: "10",
  minimumEconomicMarginPercent: "10",
  minimumCashProfitPerHourUsd: "10",
  minimumEconomicProfitPerHourUsd: "10",
};

export interface ProfitabilityAnalysis {
  calculation: CalculationResult;
  cashProfit: Decimal;
  economicProfit: Decimal | null;
  cashMarginPercent: Decimal | null;
  economicMarginPercent: Decimal | null;
  cashProfitPerUnit: Decimal;
  economicProfitPerUnit: Decimal | null;
  productionHoursPerUnit: Decimal | null;
  plannedProductionHours: Decimal | null;
  cashProfitPerHour: Decimal | null;
  economicProfitPerHour: Decimal | null;
  economicLabourCostUsd: Decimal | null;
  grade: ProfitabilityGrade;
  riskFlags: ProfitabilityRiskFlag[];
  warnings: string[];
}

const safeMargin = (profit: Decimal, revenue: Decimal) =>
  revenue.gt(0) ? profit.div(revenue).mul(100) : null;

export function profitabilityGrade(
  cashProfit: DecimalInput,
  cashMargin: DecimalInput | null,
  thresholds = defaultProfitabilityThresholds,
): ProfitabilityGrade {
  const profit = d(cashProfit);
  if (cashMargin === null) return "D";
  const margin = d(cashMargin);
  if (
    profit.gte(thresholds.gradeAProfitUsd) &&
    margin.gte(thresholds.gradeAMarginPercent)
  )
    return "A";
  if (
    profit.gte(thresholds.gradeBProfitUsd) &&
    margin.gte(thresholds.gradeBMarginPercent)
  )
    return "B";
  if (
    profit.gte(thresholds.gradeCProfitUsd) &&
    margin.gte(thresholds.gradeCMarginPercent)
  )
    return "C";
  return "D";
}

export function analyzeProfitability(input: {
  calculatorInput: CalculatorInput;
  economicHourlyRateTry?: DecimalInput | null;
  quantity?: DecimalInput;
  thresholds?: ProfitabilityThresholds;
  customsSensitive?: boolean;
}): ProfitabilityAnalysis {
  const thresholds = input.thresholds ?? defaultProfitabilityThresholds;
  const calculation = calculate(input.calculatorInput);
  const cashProfit = calculation.totals.estimatedAfterReserveProfit;
  const revenue = calculation.totals.grossRevenue;
  const hours = d(input.calculatorInput.laborHours);
  const configuredHours = hours.gt(0) ? hours : null;
  const economicRate =
    input.economicHourlyRateTry === null ||
    input.economicHourlyRateTry === undefined
      ? null
      : d(input.economicHourlyRateTry);
  const economicLabourCostUsd =
    configuredHours && economicRate?.gte(0)
      ? configuredHours.mul(economicRate).div(input.calculatorInput.usdTryRate)
      : null;
  const economicProfit = economicLabourCostUsd
    ? cashProfit.minus(economicLabourCostUsd)
    : null;
  const cashMarginPercent = safeMargin(cashProfit, revenue);
  const economicMarginPercent = economicProfit
    ? safeMargin(economicProfit, revenue)
    : null;
  const quantity = d(input.quantity ?? 1);
  const plannedProductionHours = configuredHours
    ? configuredHours.mul(quantity)
    : null;
  const cashProfitPerHour = configuredHours
    ? cashProfit.div(configuredHours)
    : null;
  const economicProfitPerHour =
    configuredHours && economicProfit
      ? economicProfit.div(configuredHours)
      : null;
  const flags: ProfitabilityRiskFlag[] = [];
  if (cashProfit.lt(0)) flags.push("NEGATIVE_PROFIT");
  if (cashProfit.lt(thresholds.lowProfitUsd)) flags.push("LOW_PROFIT");
  if (
    cashMarginPercent &&
    cashMarginPercent.lt(thresholds.criticalMarginPercent)
  )
    flags.push("CRITICAL_MARGIN");
  if (cashProfit.gt(0) && economicProfit?.lt(0)) flags.push("ECONOMIC_LOSS");
  if (!configuredHours || economicRate === null)
    flags.push("LABOUR_DATA_MISSING");
  if (
    revenue.gt(0) &&
    calculation.totals.internationalShippingUsd
      .div(revenue)
      .mul(100)
      .gt(thresholds.shippingHeavyPercent)
  )
    flags.push("SHIPPING_HEAVY");
  if (
    revenue.gt(0) &&
    calculation.totals.allocatedBusinessOverheadUsd
      .div(revenue)
      .mul(100)
      .gt(thresholds.overheadHeavyPercent)
  )
    flags.push("OVERHEAD_HEAVY");
  if (input.customsSensitive) flags.push("CUSTOMS_SENSITIVE");
  const warnings = [...calculation.warnings];
  if (!configuredHours) warnings.push("Production time not configured.");
  if (economicLabourCostUsd === null)
    warnings.push("Economic labour cost not configured");
  if (revenue.lte(0))
    warnings.push("Margin unavailable because revenue is zero or negative.");
  return {
    calculation,
    cashProfit,
    economicProfit,
    cashMarginPercent,
    economicMarginPercent,
    cashProfitPerUnit: cashProfit,
    economicProfitPerUnit: economicProfit,
    productionHoursPerUnit: configuredHours,
    plannedProductionHours,
    cashProfitPerHour,
    economicProfitPerHour,
    economicLabourCostUsd,
    grade: profitabilityGrade(cashProfit, cashMarginPercent, thresholds),
    riskFlags: flags,
    warnings,
  };
}

export type ProfitabilityTargetKind =
  "cashProfit" | "economicProfit" | "cashMargin" | "economicMargin";

export interface SolverResult {
  success: boolean;
  price: Decimal | null;
  iterations: number;
  reason?: string;
}

export function solveProfitabilityTarget(input: {
  calculatorInput: CalculatorInput;
  economicHourlyRateTry?: DecimalInput | null;
  target: { kind: ProfitabilityTargetKind; value: DecimalInput };
  discountPercent?: DecimalInput;
  lowerBound?: DecimalInput;
  upperBound?: DecimalInput;
  tolerance?: DecimalInput;
  maxIterations?: number;
  thresholds?: ProfitabilityThresholds;
}): SolverResult {
  const target = d(input.target.value);
  if (!target.isFinite() || target.lt(0))
    return {
      success: false,
      price: null,
      iterations: 0,
      reason: "Invalid target",
    };
  let low = d(input.lowerBound ?? "0.01");
  let high = d(input.upperBound ?? "10000");
  const tolerance = d(input.tolerance ?? "0.01");
  const maxIterations = input.maxIterations ?? 200;
  if (low.lte(0) || high.lte(low) || tolerance.lte(0))
    return {
      success: false,
      price: null,
      iterations: 0,
      reason: "Invalid solver bounds",
    };
  const discount = d(input.discountPercent ?? 0);
  const evaluate = (price: Decimal) => {
    const analysis = analyzeProfitability({
      calculatorInput: {
        ...input.calculatorInput,
        itemSubtotalUsd: price,
        sellerFundedDiscountUsd: price.mul(discount).div(100),
      },
      economicHourlyRateTry: input.economicHourlyRateTry,
      thresholds: input.thresholds,
    });
    switch (input.target.kind) {
      case "cashProfit":
        return analysis.cashProfit;
      case "economicProfit":
        return analysis.economicProfit;
      case "cashMargin":
        return analysis.cashMarginPercent;
      case "economicMargin":
        return analysis.economicMarginPercent;
    }
  };
  const upperValue = evaluate(high);
  if (upperValue === null || upperValue.lt(target))
    return {
      success: false,
      price: null,
      iterations: 0,
      reason: "Target is impossible within the configured price bounds",
    };
  let iterations = 0;
  while (iterations < maxIterations && high.minus(low).gt(tolerance)) {
    iterations += 1;
    const mid = low.plus(high).div(2);
    const value = evaluate(mid);
    if (value !== null && value.gte(target)) high = mid;
    else low = mid;
  }
  return { success: true, price: roundMoney(high), iterations };
}

export function overheadSensitivity(input: {
  calculatorInput: CalculatorInput;
  economicHourlyRateTry?: DecimalInput | null;
  quantity: DecimalInput;
  volumes?: number[];
  thresholds?: ProfitabilityThresholds;
}) {
  const current = Math.max(
    1,
    Math.round(Number(input.calculatorInput.expectedMonthlyOrders)),
  );
  const volumes = [
    ...new Set([5, 10, 12, 20, 30, 50, current, ...(input.volumes ?? [])]),
  ].sort((a, b) => a - b);
  return volumes.map((volume) => {
    const analysis = analyzeProfitability({
      calculatorInput: {
        ...input.calculatorInput,
        expectedMonthlyOrders: volume,
      },
      economicHourlyRateTry: input.economicHourlyRateTry,
      quantity: input.quantity,
      thresholds: input.thresholds,
    });
    const quantity = d(input.quantity);
    return {
      volume,
      overheadPerOrder:
        analysis.calculation.totals.allocatedBusinessOverheadUsd,
      totalAllocatedOverhead:
        analysis.calculation.totals.allocatedBusinessOverheadUsd.mul(quantity),
      cashProfit: analysis.cashProfit.mul(quantity),
      cashMarginPercent: analysis.cashMarginPercent,
      economicProfit: analysis.economicProfit?.mul(quantity) ?? null,
      economicMarginPercent: analysis.economicMarginPercent,
    };
  });
}

export function profitabilityRecommendations(
  analysis: ProfitabilityAnalysis,
  thresholds = defaultProfitabilityThresholds,
) {
  const messages: string[] = [];
  if (analysis.cashProfit.lt(thresholds.minimumCashProfitUsd))
    messages.push(
      `This product leaves only $${analysis.cashProfit.toFixed(2)} cash profit.`,
    );
  if (
    analysis.cashProfit.gt(0) &&
    analysis.cashProfit.mul(3).lt(analysis.calculation.totals.grossRevenue)
  )
    messages.push(
      "A single return could erase the profit from multiple sales.",
    );
  if (analysis.riskFlags.includes("ECONOMIC_LOSS"))
    messages.push(
      "This product is cash-profitable but economically loss-making after unpaid labour.",
    );
  if (
    analysis.economicProfit &&
    analysis.economicProfit.lt(thresholds.minimumEconomicProfitUsd)
  )
    messages.push(
      `Economic profit is below the configured ${formatThreshold(thresholds.minimumEconomicProfitUsd, "$", "")} target.`,
    );
  if (
    analysis.cashMarginPercent &&
    analysis.cashMarginPercent.lt(thresholds.minimumCashMarginPercent)
  )
    messages.push(
      `Cash margin is below the configured ${formatThreshold(thresholds.minimumCashMarginPercent, "", "%")} target.`,
    );
  if (
    analysis.economicMarginPercent &&
    analysis.economicMarginPercent.lt(thresholds.minimumEconomicMarginPercent)
  )
    messages.push(
      `Economic margin is below the configured ${formatThreshold(thresholds.minimumEconomicMarginPercent, "", "%")} target.`,
    );
  if (
    analysis.cashProfitPerHour &&
    analysis.cashProfitPerHour.lt(thresholds.minimumCashProfitPerHourUsd)
  )
    messages.push(
      "Cash profit per production hour is below its configured target.",
    );
  if (
    analysis.economicProfitPerHour &&
    analysis.economicProfitPerHour.lt(
      thresholds.minimumEconomicProfitPerHourUsd,
    )
  )
    messages.push(
      "Economic profit per production hour is below its configured target.",
    );
  const revenue = analysis.calculation.totals.grossRevenue;
  if (analysis.riskFlags.includes("SHIPPING_HEAVY") && revenue.gt(0))
    messages.push(
      `International shipping consumes ${analysis.calculation.totals.internationalShippingUsd.div(revenue).mul(100).toFixed(1)}% of seller revenue.`,
    );
  if (analysis.riskFlags.includes("OVERHEAD_HEAVY") && revenue.gt(0))
    messages.push(
      `Allocated monthly overhead consumes ${analysis.calculation.totals.allocatedBusinessOverheadUsd.div(revenue).mul(100).toFixed(1)}% of seller revenue and is a major controllable cost.`,
    );
  if (analysis.riskFlags.includes("CUSTOMS_SENSITIVE"))
    messages.push(
      "This product becomes unprofitable under the seller-paid customs scenario.",
    );
  if (!analysis.productionHoursPerUnit)
    messages.push(
      "Production time is missing, so hourly profitability cannot be calculated.",
    );
  return messages;
}

function formatThreshold(value: DecimalInput, prefix: string, suffix: string) {
  return `${prefix}${d(value).toFixed(2)}${suffix}`;
}
