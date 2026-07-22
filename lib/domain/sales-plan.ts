import Decimal from "decimal.js";
import type { DecimalInput } from "./money";

export interface AggregateTaxReserveResult {
  aggregatePreTaxProfit: Decimal;
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
): AggregateTaxReserveResult {
  const preTax = new Decimal(aggregatePreTaxProfit);
  const rate = Decimal.max(0, taxReserveRate).div(100);
  const taxReserve = preTax.gt(0) ? preTax.mul(rate) : new Decimal(0);
  return {
    aggregatePreTaxProfit: preTax,
    taxReserve,
    finalProfit: preTax.minus(taxReserve),
  };
}
