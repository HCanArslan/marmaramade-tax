import Decimal from "decimal.js";
import type { DecimalInput } from "./money";

export const MICRO_EXPORT_BENEFIT_TAX_BASE =
  "MICRO_EXPORT_50_PERCENT_PLANNING_BASE";
export const FULL_BUSINESS_PROFIT_TAX_BASE =
  "FULL_BUSINESS_PROFIT_PLANNING_BASE";

export function microExportBenefitEnabledFromTaxBase(
  taxBase: string | null | undefined,
) {
  return taxBase !== FULL_BUSINESS_PROFIT_TAX_BASE;
}

export function calculateIncomeTaxPlanningReserve(input: {
  businessProfit: DecimalInput;
  reserveRate: DecimalInput;
  useMicroExportBenefit: boolean;
}) {
  const businessProfit = new Decimal(input.businessProfit);
  const positiveBusinessProfit = Decimal.max(0, businessProfit);
  const taxablePlanningBase = input.useMicroExportBenefit
    ? positiveBusinessProfit.mul("0.5")
    : positiveBusinessProfit;
  const reserveRate = Decimal.max(0, input.reserveRate).div(100);
  const reserve = taxablePlanningBase.mul(reserveRate);

  return {
    businessProfit,
    taxablePlanningBaseWithoutBenefit: positiveBusinessProfit,
    taxablePlanningBaseWithBenefit: positiveBusinessProfit.mul("0.5"),
    taxablePlanningBase,
    reserve,
    finalProfitAfterReserve: businessProfit.minus(reserve),
  };
}
