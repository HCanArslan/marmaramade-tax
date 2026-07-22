import Decimal from "decimal.js";
import type { DecimalInput } from "./money";
import { calculateIncomeTaxPlanningReserve } from "./income-tax-planning";

export interface AggregateTaxReserveResult {
  aggregatePreTaxProfit: Decimal;
  taxablePlanningProfit: Decimal;
  taxReserve: Decimal;
  finalProfit: Decimal;
}

export type FixedOverheadMode =
  "EXPECTED_ANNUAL_SALES" | "FULL_ANNUAL" | "EXCLUDED";

export function allocateAnnualOverhead(input: {
  annualOverhead: DecimalInput;
  mode: FixedOverheadMode;
  plannedUnits: DecimalInput;
  expectedAnnualSales: DecimalInput;
}) {
  const annual = Decimal.max(0, input.annualOverhead);
  const plannedUnits = Decimal.max(0, input.plannedUnits);
  const expectedSales = Decimal.max(0, input.expectedAnnualSales);
  if (input.mode === "EXCLUDED") return new Decimal(0);
  if (input.mode === "FULL_ANNUAL") return annual;
  return expectedSales.gt(0)
    ? annual.div(expectedSales).mul(plannedUnits)
    : new Decimal(0);
}

export interface SalesProjectionInput {
  salesQuantity: DecimalInput;
  averageSellerRevenue: DecimalInput;
  averageVariableCost: DecimalInput;
  annualFixedBusinessCosts: DecimalInput;
  taxReserveRate: DecimalInput;
  useMicroExportIncomeTaxBenefit?: boolean;
  averageProductionHours?: DecimalInput | null;
  averageEconomicLabourCost?: DecimalInput | null;
}

export function calculateSalesProjection(input: SalesProjectionInput) {
  const salesQuantity = Decimal.max(0, input.salesQuantity).floor();
  const averageSellerRevenue = new Decimal(input.averageSellerRevenue);
  const averageVariableCost = new Decimal(input.averageVariableCost);
  const averageContribution = averageSellerRevenue.minus(averageVariableCost);
  const projectedRevenue = averageSellerRevenue.mul(salesQuantity);
  const projectedVariableCosts = averageVariableCost.mul(salesQuantity);
  const projectedContribution = averageContribution.mul(salesQuantity);
  const fixedBusinessCosts = Decimal.max(0, input.annualFixedBusinessCosts);
  const aggregatePreTaxProfit = projectedContribution.minus(fixedBusinessCosts);
  const aggregateTax = calculateAggregateTaxReserve(
    aggregatePreTaxProfit,
    input.taxReserveRate,
    input.useMicroExportIncomeTaxBenefit,
  );
  const economicLabourCost =
    input.averageEconomicLabourCost === null ||
    input.averageEconomicLabourCost === undefined
      ? null
      : new Decimal(input.averageEconomicLabourCost).mul(salesQuantity);
  const economicProfit = economicLabourCost
    ? aggregateTax.finalProfit.minus(economicLabourCost)
    : null;
  const productionHours =
    input.averageProductionHours === null ||
    input.averageProductionHours === undefined
      ? null
      : new Decimal(input.averageProductionHours).mul(salesQuantity);
  const cashMargin = projectedRevenue.gt(0)
    ? aggregateTax.finalProfit.div(projectedRevenue).mul(100)
    : null;
  const breakEvenSales = averageContribution.gt(0)
    ? fixedBusinessCosts.div(averageContribution).ceil()
    : null;
  return {
    salesQuantity,
    projectedRevenue,
    projectedVariableCosts,
    averageContribution,
    projectedContribution,
    fixedBusinessCosts,
    aggregatePreTaxProfit,
    taxablePlanningProfit: aggregateTax.taxablePlanningProfit,
    taxReserve: aggregateTax.taxReserve,
    finalCashProfit: aggregateTax.finalProfit,
    economicProfit,
    productionHours,
    cashMargin,
    breakEvenSales,
    salesRemainingToBreakEven: breakEvenSales
      ? Decimal.max(0, breakEvenSales.minus(salesQuantity))
      : null,
    breakEvenMonthlySales: breakEvenSales ? breakEvenSales.div(12) : null,
  };
}

export function calculateAggregateTaxReserve(
  aggregatePreTaxProfit: DecimalInput,
  taxReserveRate: DecimalInput,
  useMicroExportIncomeTaxBenefit = false,
): AggregateTaxReserveResult {
  const result = calculateIncomeTaxPlanningReserve({
    businessProfit: aggregatePreTaxProfit,
    reserveRate: taxReserveRate,
    useMicroExportBenefit: useMicroExportIncomeTaxBenefit,
  });
  return {
    aggregatePreTaxProfit: result.businessProfit,
    taxablePlanningProfit: result.taxablePlanningBase,
    taxReserve: result.reserve,
    finalProfit: result.finalProfitAfterReserve,
  };
}
